import api from './api.js';
import { useEffect, useState } from "react";

/*
userData:
Object { _id: "6975e0d16ef729c5588d27a3", username: "Armaan", email: "armaanmohanamoli@gmail.com", passwordHash: "$2b$10$0hWxPDf5n3eYdgP8fPp/fO0ZpRkvuFvPaFS.J7Gwbn9XtEnaOL7sG", balance: 946502.71, createdAt: "2026-01-25T09:22:25.942Z", lastLogin: "2026-01-25T09:22:25.942Z", __v: 0, blockedMargin: 0 }
__v: 0
_id: "6975e0d16ef729c5588d27a3"
balance: 946502.71
blockedMargin: 0
createdAt: "2026-01-25T09:22:25.942Z"
email: "armaanmohanamoli@gmail.com"
lastLogin: "2026-01-25T09:22:25.942Z"
passwordHash: "$2b$10$0hWxPDf5n3eYdgP8fPp/fO0ZpRkvuFvPaFS.J7Gwbn9XtEnaOL7sG"
username: "Armaan"

TradeHistory:
0: Object { _id: "699462507738e25153187fac", userId: "6975e0d16ef729c5588d27a3", symbol: "SOL-USD", … }
__v: 0
_id: "699462507738e25153187fac"
orderId: "421b2f26-22b5-4e8d-b80d-03a62321fbbc"
price: 85.35
realizedPL: 0
shares: 5
symbol: "SOL-USD"
timestamp: "2026-02-17T12:42:56.879Z"
type: "buy"
userId: "6975e0d16ef729c5588d27a3"
<prototype>: Object { … }
1: Object { _id: "699462977738e25153187fb4", userId: "6975e0d16ef729c5588d27a3", symbol: "ETH-USD", … }
*/

export default function UserProfile(){

    const [userData , setUserData] = useState(null); // state of user personal data
    const [tradeHistory , setTradeHistory] = useState(null);
    const [error , setError] = useState(null);
    useEffect(()=>{
        
        const fetchData = async()=>{
            try{
                const Data = await api.get("/user-data");
                const tradeHistoryData = await api.get("/trade-history");

                setUserData(Data.data);
                setTradeHistory(tradeHistoryData.data);

                console.log(tradeHistoryData.data);
                console.log(Data.data);
            }catch(error){
                setError(error);
                console.error("Error fetching user data: " , error)
            }
        }
        fetchData();
    },[]);

    if(error) return (<div>Error: {error.message}</div>);
    if(!userData) return (<div>Loading...</div>);
    if(!tradeHistory) return (<div>Loading...</div>);
    return(

        <div className="w-screen h-dvh grid grid-cols-10 gap-1 grid-row-1"> 

        {/* dividing the whole page into 10 columns assing 3 cols to profile Pic
            and Name and 7 cols to other user info and their trade history*/}

            <div className="grid grid-rows-10 col-span-2 sticky">
                <div className="row-span-4 bg-blue-600 p-4">
                    <div className="w-[250px] h-[250px] rounded-full aspect-square bg-blue-500 ">Profile Picture</div>
                </div>
                <div className="row-span-6 bg-blue-800">
                    Name
                    Email
                    update profile
                    Delete Account
                </div>
            </div>

            <div className="grid grid-rows-10 col-span-8 bg-blue-400">
                <div className="grid grid-cols-2 row-span-3 bg-blue-600 "> 
                    <div className="col-span-1 bg-blue-700"> Current Balance</div>
                    <div className="col-span-1"> Current Equity</div>
                </div>
                <div className="row-span-7 bg-blue-800">Trade History Table</div>

            </div>
        </div>
    );
    
}