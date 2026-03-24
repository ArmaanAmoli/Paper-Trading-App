import mongoose from "mongoose";
import process from 'node:process';
import { User, Portfolio, Trade, Watchlist } from "./mongoSchema.js"
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

mongoose.connect(String(process.env.MONGO_URL)).then(() => {
    console.log("CONNECTED");
}).catch(err => {
    console.log(err);
})


export async function SignUp(details) {
    const { email, password, username } = details;
    const passwordHash = await bcrypt.hash(password, 10); //SaltRounds = 10
    const newUser = new User({ username: username, email: email, passwordHash: passwordHash, createdAt: Date.now(), lastLogin: Date.now() });
    await newUser.save();
}

export async function login(details) {
    const { email, password } = details;
    const userData = await User.findOne({ email: email });
    if (!userData) return null;
    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) {
        return null;
    }
    return userData;
}

export async function portfolio(userId) {
    const positions = await Portfolio.find({ userId });
    return ({
        count: positions.length,
        positions
    });
}


async function newTradeF(userId, symbol, shares, price, type, realizedPL, session, orderId) {
    const newTrade = new Trade({
        userId: userId,
        symbol: symbol,
        shares: shares,
        price: price,
        type: type,
        timestamp: Date.now(),
        realizedPL: realizedPL,
        orderId: orderId
    })
    await newTrade.save({ session });
}

export async function executeTrade(positionDetails, userId) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        let { symbol, qty, price, side, orderId } = positionDetails;
        qty = Number(qty);

        // Duplicate check
        const existing = await Trade.findOne({ orderId }).session(session);
        if (existing) {
            await session.abortTransaction();
            return { success: true, duplicate: true };
        }

        const filter = { userId, symbol };

        const user = await User.findById(userId).session(session);
        if (!user) throw new Error("User not found");

        // 🔧 FIX: Ensure blockedMargin exists
        if (!user.blockedMargin) user.blockedMargin = 0;

        const delta = side === "buy" ? qty : -qty;

        let realizedPL = 0;
        let newShares = delta;
        let newAvgPrice = price;

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

            if (Math.sign(oldShares) === Math.sign(delta)) {
                // Same direction add
                newShares = oldShares + delta;
                newAvgPrice =
                    ((Math.abs(oldShares) * oldAvg) +
                        (Math.abs(delta) * price)) /
                    Math.abs(newShares);

                portfolio.shares = newShares;
                portfolio.avgPrice = newAvgPrice;
                portfolio.positionType = newShares > 0 ? "long" : "short";
                portfolio.lastUpdated = Date.now();

                // Tracking all changes and sending a mongo query to update DB
                await portfolio.save({ session });
            }
            else {
                // Opposite direction (closing or flipping)

                /*
                for example you have 10 shares short -> -10 and you bought 11 shares then closing quantity will be 10.
                Another example is if you have 10 shares short-> -10 and you brought 5 shares then closing quantity will be 5.
                closing qty is the number of shares that reduces an existing position
                */
                closedQty = Math.min(Math.abs(oldShares), Math.abs(delta));

                // Realized PnL
                realizedPL =
                    oldShares > 0
                        ? closedQty * (price - oldAvg)
                        : closedQty * (oldAvg - price);

                newShares = oldShares + delta;

                if (Math.sign(newShares) !== Math.sign(oldShares) && newShares !== 0) {
                    newAvgPrice = price; // flipped
                } else {
                    newAvgPrice = oldAvg;
                }

                if (newShares === 0) {
                    await Portfolio.deleteOne(filter, { session });
                } else {
                    await Portfolio.updateOne(filter, {
                        $set: {
                            shares: newShares,
                            avgPrice: newAvgPrice,
                            positionType: newShares > 0 ? "long" : "short",
                            lastUpdated: Date.now()
                        }
                    }, { session });
                }
            }
        }
        else {
            // New position
            await Portfolio.create([{
                userId,
                symbol,
                shares: delta,
                avgPrice: price,
                positionType: delta > 0 ? "long" : "short",
                lastUpdated: Date.now()
            }], { session });

            newShares = delta;
        }

        // ================================
        //          CASH FLOW
        // ================================

        const tradeValue = price * qty;
        const cashDelta = side === "buy" ? -tradeValue : tradeValue;

        user.balance += cashDelta;

        // ================================
        //          MARGIN LOGIC
        // ================================

        let shortAddedQty = 0;
        let shortReducedQty = 0;

        if (!portfolio && delta < 0) {
            // Fresh short
            shortAddedQty = Math.abs(delta);
        }
        else if (portfolio) {

            // Increasing short
            if (oldShares < 0 && delta < 0) {
                shortAddedQty = Math.abs(delta);
            }

            // Flipping long → short
            if (oldShares > 0 && newShares < 0) {
                shortAddedQty = Math.abs(newShares);
            }

            // Reducing short
            if (oldShares < 0 && delta > 0) {
                shortReducedQty = closedQty;
            }
        }

        // Apply margin addition AFTER knowing shortAddedQty
        if (shortAddedQty > 0) {
            const requiredMargin = 1.5 * price * shortAddedQty;

            const available = user.balance - user.blockedMargin; // FIX

            if (available < requiredMargin) {
                throw new Error("Insufficient margin for short position");
            }

            user.blockedMargin += requiredMargin;
        }

        // Release margin when reducing short
        if (shortReducedQty > 0) {
            const marginToRelease = 1.5 * oldAvg * shortReducedQty;
            user.blockedMargin -= marginToRelease;
        }

        // Prevent negative margin
        if (user.blockedMargin < 0) {
            user.blockedMargin = 0;
        }

        // ================================
        //           SAVE TRADE
        // ================================

        await newTradeF(
            userId,
            symbol,
            qty,
            price,
            side,
            realizedPL,
            session,
            orderId
        );

        await user.save({ session });

        await session.commitTransaction();
        return { success: true };

    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function GetUserData(userId) {
    const userData = await User.findById(userId);
    if (!userData) return null;
    // console.log(userData);
    return userData;
}


export async function GetTradeHistory(userID) {
    const tradeHistory = await Trade.find({ "userId": new ObjectId(userID) });

    if (!tradeHistory) return null;
    return tradeHistory;
}


// STILL NEED TO BE TESTED
export async function GetUserWatchlist(userID) {
    const userWatchlist = await Watchlist.find({ "userId": new ObjectId(userID) });
    if (!userWatchlist) return null;
    return userWatchlist;
}

// STILL NEED TO BE TESTED
export async function AddToWatchlist(userID, symbol) {
    try {
        await Watchlist.updateOne(
            { "userId": new ObjectId(userID) },
            { $addToSet: {symbols:symbol} },
            { upsert: true }
        );
        return true;
    }catch(err){
        console.log(`Error while posting new symbol to watchlist: ${err}`)
        return false;
    }
    
}