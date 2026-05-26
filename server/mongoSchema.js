import { Double } from "mongodb";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    balance: { type: Number, default: 1000000 },
    blockedMargin: {type: Number , default:0},
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

const User = mongoose.model('User', UserSchema);

const watchlistSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId , ref: 'User' , required: true},
    symbols:{type:[String] , required:true , default:[]}
});
const Watchlist = mongoose.model('Watchlist' , watchlistSchema);

const PortfolioSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    shares: { type: Number, required: true },
    avgPrice: { type: Number, required: true },
    positionType: { type: String, enum: ['long', 'short'] },
    lastUpdated: { type: Date, default: Date.now }
});
const Portfolio = mongoose.model('Portfolio', PortfolioSchema);

const TradeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symbol: { type: String, required: true },
    shares: { type: Number, required: true },
    price:  { type: Number, required: true },
    type:   { type: String, enum: ['buy', 'sell'], required: true },
    timestamp: { type: Date, default: Date.now },
    realizedPL: { type: Number, required: true },
    orderId: { type: String, required: true, unique: true },
    wasStopLoss: {type: Boolean , required: true , default:false}
});
const Trade = mongoose.model('Trade', TradeSchema);

const StopLossSchema = new mongoose.Schema({
    userId:{type:mongoose.ObjectId , ref:'User' , required: true},
    symbol:{type:String , required: true},
    price:{type:Double , required:true},
    startDate:{type:Date , default:Date.now() , required: true},
    type: {type:String , enum:['buy' , 'sell'] , required: true},
    quantity:{type:Number},
    
});
const StopLoss = mongoose.model('StopLoss' , StopLossSchema);

export { User, Portfolio, Trade , Watchlist , StopLoss};