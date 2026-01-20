import express, { application } from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
import { SignUp, login } from './queryManager.js';

const server = express();
const port = 3000;

await mongoose.connect(String(process.env.MONGO_URL));

application.use(express.json());
const validateEmail = (req,res,next)=>{
    const {email} = req.body;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(pattern.test(email)){
        return next();
    }
    else{
        res.status(400).json({message:"Invalid email"});
        return;
    }

}

server.post('/sign-up', validateEmail , async(req,res,next)=>{
    try{
        await SignUp(req.body);
        res.status(200).json({message:"User Registered"});
    }catch(err){
        next(err);
    }
});

server.post('/login', validateEmail , async(req,res,next)=>{
    try{
        const isValidlogin = await login(req.body); 
        if(isValidlogin){
            res.status(200).json({message:"Login Success"});
            return;
        }
        else{
            res.status(401).json({message:"Incorrect Password"});
        }
    }catch(err){
        next(err);
    }
});

// Global Error Handler Middleware
server.use((err,res) => {
    console.error(`Error Stack: ${err.stack}`);
    const statusCode = err.status || 500; // If error already have a status code if not give it 500(Server Error)
    res.status(statusCode).send("Server Error");
});

server.listen(port, (error)=>{
    if(!error){
        console.log(`Server running on http:/localhost:${port}`)
    }else{
        console.log("An error occured, unable to start server.")
    }
});