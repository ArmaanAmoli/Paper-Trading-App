import mongoose from "mongoose";
import process from 'node:process';
import { User, Portfolio, Trade } from "./mongoSchema.js"
import bcrypt from "bcrypt";

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


async function newTradeF(userId, symbol, shares, price, type, realizedPL) {
    const newTrade = new Trade({
        userId: userId,
        symbol: symbol,
        shares: shares,
        price: price,
        type: type,
        timestamp: Date.now(),
        realizedPL: realizedPL
    })
    await newTrade.save();
}

export async function executeTrade(positionDetails, userId) {

    const { symbol, qty, price, side } = positionDetails;
    const filter = { userId: userId, symbol: symbol };

    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const delta = side === "buy" ? qty : -qty;

    let realizedPL = 0;
    let newShares = delta;
    let newAvgPrice = price;

    const portfolio = await Portfolio.findOne(filter);
    if (portfolio) { //Existing Position
        const oldShares = portfolio.shares;
        const oldAvg = portfolio.avgPrice;

        //same Direction Add
        if (Math.sign(oldShares) === Math.sign(delta)) {
            newShares = oldShares + delta;
            newAvgPrice = ((Math.abs(oldShares) * oldAvg) + (Math.abs(delta) * price)) / Math.abs(newShares);
        }
        else {
            const closedQty = Math.min(Math.abs(oldShares), Math.abs(delta));

            // realized PnL
            realizedPL =
                oldShares > 0
                    ? closedQty * (price - oldAvg)     // closing long
                    : closedQty * (oldAvg - price);    // closing short

            newShares = oldShares + delta;
            // flipped → reset avg price
            if (Math.sign(newShares) !== Math.sign(oldShares) && newShares !== 0) {
                newAvgPrice = price;
            } else {
                newAvgPrice = oldAvg;
            }

            if (newShares === 0) {
                await Portfolio.deleteOne(filter);
            } else {
                await Portfolio.updateOne(filter, {
                    $set: {
                        shares: newShares,
                        avgPrice: newAvgPrice,
                        positionType: newShares > 0 ? "long" : "short",
                        lastUpdated: Date.now()
                    }
                });
            }
        }
    }
    else {
        await Portfolio.create({
            userId,
            symbol,
            shares: delta,
            avgPrice: price,
            positionType: delta > 0 ? "long" : "short",
            lastUpdated: Date.now()
        });
    }
    await newTradeF(userId, symbol, qty, price, side, realizedPL);

    const cashDelta = side === "buy" ? -price * qty : price * qty;
    user.balance += cashDelta;
    await user.save();

    return 1;

}