import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { User } from '../Schemas/mongoSchema.js';
import webpush from 'web-push';
const WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY;
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY;

webpush.setVapidDetails(
    'mailto:armaanmohanamoli007@gmail.com',
    WEB_PUSH_PUBLIC_KEY,
    WEB_PUSH_PRIVATE_KEY
);

export async function sendPushNotification(userId , title , body){
    console.log("push notification called")
    const user = await User.findById(userId).lean();
    if(!user) throw Error("Can't find user");
    const subscription = user.notificationSubscription;
    const payload = JSON.stringify({
        title:title,
        body:body,
        icon:'../../src/assets/Icons/ico.png'
    });
    try{
        await webpush.sendNotification(subscription , payload);
        console.log('notificaiton sended');
        return {success:true}
    }catch(error){
        console.error('Push notification failed: ' , error);
        throw error;
    }
}