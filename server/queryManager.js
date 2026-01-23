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

export async function buy(positionDetails, userId) {
    const { symbol, qty, price } = positionDetails;
    const filter = { userId: userId, symbol: symbol };
    const portfolioBefore = await Portfolio.findOne(filter);
    const { balance } = await User.findById(userId);
    const oldQty = portfolioBefore?.shares || 0;

    let oldBalance = balance;
    let newPL = 0;

    if (oldBalance < price * qty) {
        return 0;
    }

    if (!portfolioBefore || oldQty === 0) {
        //Adding the new shares to portfolio
        const newPosition = new Portfolio({
            userId: userId,
            symbol: symbol,
            shares: qty,
            avgPrice: price,
            positionType: 'long',
            lastUpdated: Date.now()
        });
        const newTrade = new Trade({
            userId: userId,
            symbol: symbol,
            shares: qty,
            price: price,
            type: 'buy',
            timestamp: Date.now(),
            realizedPL: 0
        })
        await newTrade.save();
        await newPosition.save();
    }
    else { // If an old position already exist


        const oldPositionType = portfolioBefore.positionType;
        const oldAvgPrice = portfolioBefore.avgPrice;

        let newQty = 0;
        let newPositionType = oldPositionType;
        let newAvgPrice = 0;

        if (oldPositionType === 'long') { //Add shares to already existing long position
            newQty = qty + oldQty;
            newAvgPrice = (((oldQty * oldAvgPrice) + (qty * price)) / newQty);
        }

        else { // Old existing position is short
            if (qty < oldQty) { //if old quantity is greater than new quantity in buy order position type remains short
                newQty = oldQty - qty;
                newAvgPrice = oldAvgPrice;
                newPositionType = 'short';
                newPL = (oldAvgPrice - price) * qty;

            }
            else { // if old quantity is less than new quantity in buy order the position turns long
                newQty = qty - oldQty;
                newAvgPrice = price;
                newPositionType = 'long';
                newPL = (oldAvgPrice - price) * (oldQty);
            }
        }

        const update = {
            avgPrice: newAvgPrice,
            shares: newQty,
            positionType: newPositionType,
            lastUpdated: Date.now()
        };
        await newTradeF(userId, symbol, qty, price, "buy", newPL);
        if (newQty === 0) {
            await Portfolio.deleteOne(filter);
        } else {
            await Portfolio.updateOne(filter, { $set: update });
        }


    }
    let newBalance = oldBalance - (price * qty);
    const update = {
        balance: newBalance
    }
    await User.findByIdAndUpdate(userId, update);
    return 1;

}

export async function sell(positionDetails, userId) {

    const { symbol, qty, price } = positionDetails;
    const filter = { userId: userId, symbol: symbol };
    const portfolioBefore = await Portfolio.findOne(filter);
    const oldQty = portfolioBefore?.shares || 0;
    const user = await User.findById(userId);
    let newPL = 0;

    if (!user) {
        throw new Error("User not found");
    }
    const balance = user.balance;

    if (!portfolioBefore || oldQty === 0) {
        //Adding the new shares to portfolio
        const newPosition = new Portfolio({
            userId: userId,
            symbol: symbol,
            shares: qty,
            avgPrice: price,
            positionType: 'short',
            lastUpdated: Date.now()
        });
        const newTrade = new Trade({
            userId: userId,
            symbol: symbol,
            shares: qty,
            price: price,
            type: 'sell',
            timestamp: Date.now(),
            realizedPL: 0
        })
        await newTrade.save();
        await newPosition.save();
    }
    else {

        const oldPositionType = portfolioBefore.positionType;
        const oldAvgPrice = portfolioBefore.avgPrice;

        let newQty = 0;
        let newPositionType = oldPositionType;
        let newAvgPrice = 0;

        if (oldPositionType === 'short') { //Add shares to already existing short position
            newQty = qty + oldQty;
            newAvgPrice = (((oldQty * oldAvgPrice) + (qty * price)) / newQty);
        }
        else { // Old existing position is long
            if (qty < oldQty) { //if old quantity is greater than new quantity in buy order position type remains long
                newQty = oldQty - qty;
                newAvgPrice = oldAvgPrice;
                newPositionType = 'long';
                newPL = qty * (oldAvgPrice - price);
            }
            else {
                newQty = qty - oldQty;
                newAvgPrice = price;
                newPositionType = 'short';
                newPL = oldQty * (oldAvgPrice - price)
            }
        }
        const update = {
            avgPrice: newAvgPrice,
            shares: newQty,
            positionType: newPositionType,
            lastUpdated: Date.now()
        };
        await newTradeF(userId, symbol, qty, price, "sell", newPL);
        if (newQty === 0) {
            await Portfolio.deleteOne(filter);
        } else {
            await Portfolio.updateOne(filter, { $set: update });
        }
    }
    let newBalance = balance + (price * qty);
    const update = {
        balance: newBalance
    }
    await User.findByIdAndUpdate(userId, update);
    return 1;
}