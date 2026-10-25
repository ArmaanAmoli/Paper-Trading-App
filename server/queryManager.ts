import mongoose from 'mongoose';
import { User, Portfolio, Trade, Watchlist, StopLoss } from './Schemas/mongoSchema.js';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getEnv } from './lib/env.js';
import { sendPushNotification } from './Services/notificationService.js';
import { AppError, InsufficientFundsError, InsufficientMarginError } from './lib/errors.js';

// Initialize MongoDB connection (singleton pattern - only connect once)
let isConnected = false;
export async function connectDB(): Promise<void> {
  if (!isConnected) {
    try {
      await mongoose.connect(String(getEnv().MONGO_URL));
      isConnected = true;
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection failed:', err);
      throw err;
    }
  }
}

export async function SignUp(details: {
  email: string;
  password: string;
  username: string;
}): Promise<void> {
  const { email, password, username } = details;
  const passwordHash = await bcrypt.hash(password, 10); // SaltRounds = 10
  const newUser = new User({
    username,
    email,
    passwordHash,
    createdAt: new Date(),
    lastLogin: new Date(),
  });
  await newUser.save();
}

export async function login(details: { email: string; password: string }) {
  const { email, password } = details;
  const userData = await User.findOne({ email });
  if (!userData) return null;
  const match = await bcrypt.compare(password, userData.passwordHash);
  if (!match) return null;
  return userData;
}

export async function portfolio(userId: string) {
  const objectIdUserId = new ObjectId(userId);
  const positions = await Portfolio.find({ userId: objectIdUserId });
  return {
    count: positions.length,
    positions,
  };
}

async function newTradeF(
  userId: string,
  symbol: string,
  shares: number,
  price: number,
  type: 'buy' | 'sell',
  realizedPL: number,
  session: mongoose.ClientSession,
  orderId: string,
) {
  const newTrade = new Trade({
    userId: new ObjectId(userId),
    symbol,
    shares,
    price,
    type,
    timestamp: new Date(),
    realizedPL,
    orderId,
  });
  await newTrade.save({ session });
  return newTrade;
}

export async function executeTrade(
  positionDetails: {
    symbol: string;
    qty: number | string;
    price: number | string;
    side: 'buy' | 'sell';
    orderId: string;
  },
  userId: string,
) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { symbol, qty: qtyRaw, price: priceRaw, side, orderId } = positionDetails;
    const qtyNum = Number(qtyRaw);
    const priceNum = Number(priceRaw);

    // Duplicate check
    const existing = await Trade.findOne({ orderId }).session(session);
    if (existing) {
      await session.abortTransaction();
      return { success: true, duplicate: true };
    }

    const objectIdUserId = new ObjectId(userId);
    const filter = { userId: objectIdUserId, symbol };

    const user = await User.findById(objectIdUserId).session(session);
    if (!user) throw new AppError(404, 'User not found');

    // 🔧 FIX: Ensure blockedMargin exists
    if (!user.blockedMargin) user.blockedMargin = 0;

    const delta: number = side === 'buy' ? qtyNum : -qtyNum;

    let realizedPL = 0;
    let newShares = delta;
    let newAvgPrice = priceNum;

    const portfolio = await Portfolio.findOne(filter).session(session);

    let oldShares = 0;
    let oldAvg = 0;

    if (portfolio) {
      oldShares = portfolio.shares;
      oldAvg = portfolio.avgPrice;
    }

    // ================================
    // POSITION CALCULATION
    // ================================

    let closedQty = 0;

    if (portfolio) {
      // Already have a position

      if (Math.sign(oldShares) === Math.sign(delta)) {
        // Same direction add
        newShares = oldShares + delta;
        newAvgPrice =
          (Math.abs(oldShares) * oldAvg + Math.abs(delta) * priceNum) / Math.abs(newShares);

        portfolio.shares = newShares;
        portfolio.avgPrice = newAvgPrice;
        portfolio.positionType = newShares > 0 ? 'long' : 'short';
        portfolio.lastUpdated = new Date();

        // Tracking all changes and sending a mongo query to update DB
        await portfolio.save({ session });
      } else {
        // Opposite direction (closing or flipping)

        /*
                for example you have 10 shares short -> -10 and you bought 11 shares then closing quantity will be 10.
                Another example is if you have 10 shares short-> -10 and you brought 5 shares then closing quantity will be 5.
                closing qty is the number of shares that reduces an existing position
                */
        closedQty = Math.min(Math.abs(oldShares), Math.abs(delta));

        // Realized PnL
        realizedPL =
          oldShares > 0 ? closedQty * (priceNum - oldAvg) : closedQty * (oldAvg - priceNum);

        newShares = oldShares + delta;

        if (Math.sign(newShares) !== Math.sign(oldShares) && newShares !== 0) {
          newAvgPrice = priceNum; // flipped
        } else {
          newAvgPrice = oldAvg;
        }

        if (newShares === 0) {
          await Portfolio.deleteOne(filter, { session });
        } else {
          await Portfolio.updateOne(
            filter,
            {
              $set: {
                shares: newShares,
                avgPrice: newAvgPrice,
                positionType: newShares > 0 ? 'long' : 'short',
                lastUpdated: new Date(),
              },
            },
            { session },
          );
        }
      }
    } else {
      // New position
      await Portfolio.create(
        [
          {
            userId: objectIdUserId,
            symbol,
            shares: delta,
            avgPrice: priceNum,
            positionType: delta > 0 ? 'long' : 'short',
            lastUpdated: new Date(),
          },
        ],
        { session },
      );

      newShares = delta;
    }

    // ================================
    //          CASH FLOW
    // ================================

    const tradeValue = priceNum * qtyNum;
    const cashDelta = side === 'buy' ? -tradeValue : tradeValue;

    const userDoc = await User.findById(objectIdUserId).session(session);
    if (!userDoc) throw new AppError(404, 'User not found');

    userDoc.balance = Number(userDoc.balance) + cashDelta;

    if (userDoc.balance < 0) {
      await session.abortTransaction();
      throw new InsufficientFundsError();
    }
    // ================================
    //          MARGIN LOGIC
    // ================================

    let shortAddedQty = 0;
    let shortReducedQty = 0;

    const portfolioDoc = await Portfolio.findOne(filter).session(session);

    if (!portfolioDoc && delta < 0) {
      // Fresh short
      shortAddedQty = Math.abs(delta);
    } else if (portfolioDoc) {
      const oldShares = portfolioDoc.shares;

      // Increasing short
      if (oldShares < 0 && delta < 0) {
        shortAddedQty = Math.abs(delta);
      }

      // Flipping long → short
      if (oldShares > 0 && oldShares + (side === 'buy' ? qtyNum : -qtyNum) < 0) {
        shortAddedQty = Math.abs(oldShares + (side === 'buy' ? qtyNum : -qtyNum));
      }

      // Reducing short
      if (oldShares < 0 && delta > 0) {
        shortReducedQty = Math.min(Math.abs(portfolioDoc.shares), Math.abs(delta));
      }
    }

    // Apply margin addition AFTER knowing shortAddedQty
    if (shortAddedQty > 0) {
      const requiredMargin = 1.5 * priceNum * shortAddedQty;

      const userDoc = await User.findById(objectIdUserId).session(session);
      if (!userDoc) throw new AppError(404, 'User not found');

      const available = Number(userDoc.balance) - Number(userDoc.blockedMargin); // FIX

      if (available < requiredMargin) {
        throw new InsufficientMarginError();
      }

      const userDoc2 = await User.findById(objectIdUserId).session(session);
      if (userDoc2) userDoc2.blockedMargin += requiredMargin;
    }

    // Release margin when reducing short
    if (shortReducedQty > 0) {
      const avgPriceForRelease = portfolioDoc ? portfolioDoc.avgPrice : priceNum;
      const marginToRelease = 1.5 * avgPriceForRelease * shortReducedQty;
      const userDoc = await User.findById(objectIdUserId).session(session);
      if (userDoc) userDoc.blockedMargin -= marginToRelease;
    }

    // Prevent negative margin
    const userDoc3 = await User.findById(objectIdUserId).session(session);
    if (userDoc3 && userDoc3.blockedMargin < 0) {
      userDoc3.blockedMargin = 0;
    }

    // ================================
    //           SAVE TRADE
    // ================================

    const newTrade = await newTradeF(
      userId,
      symbol,
      qtyNum,
      priceNum,
      side,
      realizedPL,
      session,
      orderId,
    );

    void User.findByIdAndUpdate(objectIdUserId, { $inc: { balance: cashDelta } }).session(session);

    await session.commitTransaction();
    return { success: true, newTrade };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    void session.endSession();
  }
}

export async function GetUserData(userId: string) {
  const userData = await User.findById(new ObjectId(userId)).select('-passwordHash');
  if (!userData) return null;
  return userData;
}

export async function GetTradeHistory(userID: string) {
  const tradeHistory = await Trade.find({ userId: new ObjectId(userID) });

  if (!tradeHistory) return null;
  return tradeHistory;
}

export async function GetUserWatchlist(userID: string) {
  const userWatchlist = await Watchlist.find({ userId: new ObjectId(userID) });
  if (!userWatchlist) return null;
  return userWatchlist;
}

export async function AddToWatchlist(userID: string, symbol: string) {
  try {
    await Watchlist.updateOne(
      { userId: new ObjectId(userID) },
      { $addToSet: { symbols: symbol } },
      { upsert: true },
    );
    return true;
  } catch (err) {
    console.log(`Error while posting new symbol to watchlist: ${String(err)}`);
    return false;
  }
}

export async function RemoveFromWatchlist(userID: string, symbol: string) {
  try {
    await Watchlist.updateOne({ userId: new ObjectId(userID) }, { $pull: { symbols: symbol } });
    return true;
  } catch (err) {
    console.log(`Error while deleting from watchlist: ${String(err)}`);
    return false;
  }
}

export async function StopLossExecuter(StopLossInfo: {
  userId: string;
  symbol: string;
  price: number;
  startDate: string;
  qty: number;
  type: 'buy' | 'sell';
}) {
  const { userId, symbol, price, startDate, qty, type } = StopLossInfo;
  const positionDetails = {
    symbol,
    qty,
    price,
    side: type,
    orderId: uuidv4(),
  };
  try {
    const tradeStatus = await executeTrade(positionDetails, userId);
    if (tradeStatus.success === true) {
      await StopLoss.deleteOne({
        userId: new ObjectId(userId),
        symbol,
        price,
        startDate,
        type,
        qty,
      });
      void sendPushNotification(
        userId,
        'Paper Trading App',
        `Stop Loss executed for ${symbol} at price ${price}`,
      );
      return { success: true };
    }
    return { success: false };
  } catch (e) {
    console.log(`An error occured while executing stoploss \n Error: ${String(e)}`);
    return { success: false };
  }
}

export async function getAllSL() {
  const stopLosses = await StopLoss.find({});
  return stopLosses;
}

export async function getUserStopLosses(userId: string) {
  const stopLosses = await StopLoss.find({ userId: new ObjectId(userId) });
  return stopLosses;
}

export async function deleteStopLoss(stopLossId: string, userId: string) {
  const result = await StopLoss.findOneAndDelete({
    _id: new ObjectId(stopLossId),
    userId: new ObjectId(userId),
  });
  return result;
}

interface NotificationSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function saveSubscription(
  userId: string,
  subscriptionObject: NotificationSubscription,
) {
  const user = await User.findById(new ObjectId(userId));
  if (user) {
    user.notificationSubscription = subscriptionObject;
    await user.save();
    return { success: true };
  } else {
    throw new AppError(404, 'user not found');
  }
}
