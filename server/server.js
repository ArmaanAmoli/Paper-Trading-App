import express, { application } from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
const server = express();
const port = 3000;

await mongoose.connect(String(process.env.MONGO_URL));

application.use(express.json());
const validateEmail = (req,res,next)=>{
    const {username , email , password} = req.body;
    
    return;
}

server.post('/sign-up', validateEmail , (req,res,next)=>{
    try{
        console.log('New entry');
    }catch(err){
        next(err);
    }
})

server.listen(port, (error)=>{
    if(!error){
        console.log(`Server running on http:/localhost:${port}`)
    }else{
        console.log("An error occured, unable to start server.")
    }
});