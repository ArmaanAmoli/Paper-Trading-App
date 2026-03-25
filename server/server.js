import express from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
import { SignUp, login, portfolio, executeTrade, GetUserData, GetTradeHistory, GetUserWatchlist, AddToWatchlist, RemoveFromWatchlist} from './queryManager.js';
import jwt from 'jsonwebtoken';
import cors from "cors";
import axios from 'axios';
import { getQuote } from './getQuote.js';
import { v4 as uuidv4 } from 'uuid';


const JWT_SECRET = process.env.JWT_SECRET
const server = express();
const port = 3000;

try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");
} catch (err) {
    console.error("MongoDB FAILED", err);
    process.exit(1);
}

//MIDDLEWARES
server.use(express.json());

// server.use(cors({
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"]
// }));
server.use(cors());


const validateEmail = (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is Required" })
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (pattern.test(email)) {
        return next();
    }
    else {
        res.status(400).json({ message: "Invalid email" });
        return;
    }

}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }
    if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token format" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token is invalid or expired", error: String(err) });
    }
}

//Request Handlers
server.post('/sign-up', validateEmail, async (req, res, next) => {
    try {
        await SignUp(req.body);
        res.status(200).json({ message: "User Registered" });
    } catch (err) {
        next(err);
    }
});

server.post('/login', validateEmail, async (req, res, next) => {
    try {
        const user = await login(req.body);
        if (!user) {
            res.status(401).json({ message: "Incorrect Password" });
            return;
        }
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.status(200).json({
            message: "Login Success",
            token
        });
    } catch (err) {
        next(err);
    }
});
server.get('/quote', verifyToken, async (req, res, next) => {
    try {
        const query = req.query;
        const ticker = query.ticker;
        const fastAPIRes = await axios.get('http://127.0.0.1:8000/quote', {
            params: {
                ticker: ticker
            }
        });
        res.json(fastAPIRes.data);
    } catch (err) { next(err) }
})
server.get('/data', verifyToken, async (req, res, next) => {
    try {
        const query = req.query;
        const ticker = query.ticker;
        const interval = query.interval;
        const period = query.period;
        const fastAPIRes = await axios.get('http://127.0.0.1:8000/data', {
            params: {
                ticker: ticker,
                period: period,
                interval: interval
            }
        });
        // console.log(fastAPIRes.data);
        res.json(fastAPIRes.data);
    } catch (err) {
        next(err);
    }
});

server.get('/portfolio', verifyToken, async (req, res, next) => {
    try {
        const userID = req.user.userId;
        const positions = await portfolio(userID);
        res.status(200).json(positions)
    } catch (err) {
        next(err);
    }
})

server.get('/user-watchlist', verifyToken, async (req, res, next) => {
    try {
        const userID = req.user.userId;
        const userWatchlist = await GetUserWatchlist(userID);
        // console.log(userWatchlist)
        res.status(200).json(userWatchlist);
    } catch (err) {
        next(err);
    }
})

server.get('/user-data', verifyToken, async (req, res, next) => {
    try {
        const userID = req.user.userId;
        //console.log(userID);
        const user = await GetUserData(userID);

        // console.log(userID);
        // console.log(user);


        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
})

server.get('/trade-history', verifyToken, async (req, res, next) => {
    try {
        const userID = req.user.userId;
        console.log(userID);
        const tradeHistory = await GetTradeHistory(userID);
        //console.log(tradeHistory);
        res.status(200).json(tradeHistory);
    } catch (err) { next(err); }
})

server.get('/search', verifyToken, async (req, res, next) => {
    const query = req.query.query;
    // console.log(query)
    try {
        const fastAPIRes = await axios.get('http://127.0.0.1:8000/search', {
            params: {
                query: query,
            }

        });
        // console.log(fastAPIRes.data)
        res.json(fastAPIRes.data);
    } catch (err) {
        next(err);
    }

})

server.post('/user-watchlist/add', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const newWatchlistItem = req.body.symbol;
        const response = await AddToWatchlist(userId, newWatchlistItem);
        if(response){
            res.status(200).json({success:true});
        }
        else{
            res.status(400).json({success:false});
        }
    } catch (err) {
        
        next(err);
    }
})



server.post('/buy', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const positionDetails = req.body;
        const { currentPrice } = await getQuote(positionDetails.symbol);
        positionDetails.price = currentPrice;
        positionDetails.orderId = uuidv4();
        const b = await executeTrade(positionDetails, userId)
        if (b.success) return res.status(200).json({ message: "Order Successfull" });
        else return res.status(422).json({ message: "Not enough balance" });
    } catch (err) {
        next(err);
    }
})

server.post('/sell', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const positionDetails = req.body;
        const { currentPrice } = await getQuote(positionDetails.symbol);
        positionDetails.price = currentPrice;
        positionDetails.orderId = uuidv4();
        const b = await executeTrade(positionDetails, userId)
        if (b.success) return res.status(200).json({ message: "Order Successfull" });
        else {
            return res.status(422).json({ message: "Something went wrong" });
        }
    } catch (err) {
        next(err);
    }
})

server.delete('/user-watchlist/delete' , verifyToken , async(req , res , next)=>{
    try{
        const userId = req.user.userId;
        const symbol = req.body.symbol;
        console.log(req.body)
        console.log(symbol);
        const response = await RemoveFromWatchlist(userId , symbol);
        if(response){
            res.status(200).json({success:true});
        }
        else{
            res.status(400).json({success:false});
        }
        
    }catch(err){
        next(err);
    }
})

// Global Error Handler Middleware
server.use((err, req, res, next) => {
    console.error(`Error Stack: ${err.stack}`);
    const statusCode = err.status || 500; // If error already have a status code if not give it 500(Server Error)
    res.status(statusCode).json({ message: err.message || "server Error" })
});

server.listen(port, (error) => {
    if (!error) {
        console.log(`Server running on http:/localhost:${port}`)
    } else {
        console.log("An error occured, unable to start server.")
    }
});