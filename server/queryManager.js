import mongoose from "mongoose";
import process from 'node:process';
import {User, Portfolio, Transaction} from "./mongoSchema.js"
import bcrypt from "bcrypt";

mongoose.connect(String(process.env.MONGO_URL)).then(()=>{
    console.log("CONNECTED");
}).catch(err =>{
    console.log(err);
})

export async function SignUp(details){
    const {email , password , username} = details;
    const passwordHash = await bcrypt.hash(password, 10); //SaltRounds = 10
    const newUser = new User({username:username , email:email , passwordHash:passwordHash, createdAt:Date.now(), lastLogin:Date.now()});
    await newUser.save();
}

export async function login(details){
    const {email , password} = details;
    const userData = await User.findOne({email:email});
    if(!userData) return null;
    const match = await bcrypt.compare(password , userData.passwordHash);
    if(!match){
        return null;
    }
    return userData; 
}