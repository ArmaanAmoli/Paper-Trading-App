import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username:{type:String, required:true, unique:true},
    email:{type:String, required:true, unique:true},
    passwordHash:{type:String, required:true},
    createdAt:{type:Date, default:Date.now},
    lastLogin:{type:Date}
});

const User = mongoose.model('User' , UserSchema);

const PortfolioSchema = new mongoose.Schema({
    userId:{type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    symbol:{type: String, require:true},
    shares:{type: Number, require:true},
    price:{type: Number , require:true},
    positionType:{type:String, enum:['long','short']},
    lastUpdated:{type:Date, default:Date.now}
});
const Portfolio = mongoose.model('Portfolio' , PortfolioSchema);

const TransactionSchema = new mongoose.Schema({
    userId:{type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    symbol:{type: String, require:true},
    shares:{type: Number, require:true},
    price:{type: Number , require:true},
    type:{type:String, enum:['buy','sell'], default:'long'},
    timestamp:{type:Date, default:Date.now}
});
const Transaction = mongoose.model('Transaction' , TransactionSchema);

export {User, Portfolio, Transaction};