import express, { application } from 'express';
import mongoose from 'mongoose';
import process from 'node:process';
import { SignUp, login, portfolio, buy, sell } from './queryManager.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET
const server = express();
const port = 3000;

await mongoose.connect(String(process.env.MONGO_URL));

//MIDDLEWARES
application.use(express.json());

const validateEmail = (req, res, next) => {
    const { email } = req.body;
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
    if (!authHeader) return res.status(401).json({ message: "No token provided" });
    const token = authHeader.split(' ')[1];
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

server.get('/portfolio', verifyToken, async (req, res, next) => {
    try {
        const userID = req.user.userId;
        const positions = await portfolio(userID);
        res.status(200).json(positions)
    } catch (err) {
        next(err);
    }
})

server.post('/buy', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const positionDetails = req.body;
        const b = await buy(positionDetails, userId)
        if (b === 1) res.status(200).json({ message: "Order Successfull" });
        else res.status(422).json({ message: "Not enough balance" });
    } catch (err) {
        next(err);
    }
})

server.post('/sell', verifyToken, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const positionDetails = req.body;
        const b = await sell(positionDetails, userId)
        if (b === 1) res.status(200).json({ message: "Order Successfull" });
        else res.status(422).json({ message: "Something went wrong" });
    } catch (err) {
        next(err);
    }
})

// Global Error Handler Middleware
server.use((err, res) => {
    console.error(`Error Stack: ${err.stack}`);
    const statusCode = err.status || 500; // If error already have a status code if not give it 500(Server Error)
    res.status(statusCode).send("Server Error");
});

server.listen(port, (error) => {
    if (!error) {
        console.log(`Server running on http:/localhost:${port}`)
    } else {
        console.log("An error occured, unable to start server.")
    }
});