import webpush from 'web-push';
const WEB_PUSH_PUBLIC_KEY = process.env.WEB_PUSH_PUBLIC_KEY;
const WEB_PUSH_PRIVATE_KEY = process.env.WEB_PUSH_PRIVATE_KEY;

webpush.setVapidDetails(
    'mailto:armaanmohanamoli007@gmail.com',
    WEB_PUSH_PUBLIC_KEY,
    WEB_PUSH_PRIVATE_KEY
);

export async function sendPushNotification(subscription , title , body){
    const payload = JSON.stringify({
        title:title,
        body:body,
        icon:'../../src/assets/Icons/ico.png'
    });

    try{
        await webpush.sendNotification(subscription , payload);
        return {success:true}
    }catch(error){
        console.error('Push notification failed: ' , error);
        throw error;
    }
}