import mongoose from "mongoose";
import process from 'node:process';
import {User, Portfolio, Transaction} from "./mongoSchema.js"

mongoose.connect(String(process.env.MONGO_URL)).then(()=>{
    console.log("CONNECTED")
    process.exit(0);
}).catch(err =>{
    console.log(err);
})