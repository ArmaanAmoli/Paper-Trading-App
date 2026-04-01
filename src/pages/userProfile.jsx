import api from './api.js';
import { useEffect, useState , useContext } from "react";
import { UserAccountContext , UserEquityContext } from './context.js';
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

    const [userData , setUserData] = useContext(UserAccountContext); // state of user personal data
    const [totalPnl , setTotalPnl] = useContext(UserEquityContext).totalPnl || 0;
    const [tradeHistory , setTradeHistory] = useState(null);
    const profilePic = "https://cdn-icons-png.flaticon.com/512/6325/6325109.png";
    
    // if(!userData) return (<div>Loading...</div>);
    // if(!tradeHistory) return (<div>Loading...</div>);
    return(

        <div className="w-screen h-dvh grid grid-cols-10 gap-1 grid-row-1 overflow-hidden"> 

        {/* dividing the whole page into 10 columns assing 3 cols to profile Pic
            and Name and 7 cols to other user info and their trade history*/}

            <div className="grid grid-rows-10 col-span-2 sticky left-0">

                <div className="row-span-3 flex items-center justify-center">
                    <div style={{ backgroundImage: `url('${profilePic}')` }} className="w-[225px] h-[225px] rounded-full aspect-square border bg-cover bg-center bg-no-repeat"></div>
                </div>

                <div className="row-span-7 border-t grid grid-rows-5">

                    <p className="row-span-1 flex flex-col justify-center items-center">
                        <div className=' text-xl font-bold'>{userData.username}</div>
                        <div>{userData.email}</div>
                    </p>

                    <div className="row-span-2 flex flex-col gap-4 justify-center items-center">
                        <button className='border h-[50px] w-[200px] rounded-3xl'>Update Profile</button>
                        <button className='border h-[50px] w-[200px] rounded-3xl'>Log out</button>
                        <button className='border h-[50px] w-[200px] rounded-3xl text-red-400 hover:bg-red-300/10'>Delete Account</button>
                    </div>
                </div>
                
            </div>

            <div className="grid grid-rows-10 col-span-8 px-2 gap-2 overflow-auto">

                <div className="grid grid-cols-2 row-span-3 gap-1"> 

                    <div className="col-span-1 ">
                        <div className="w-full h-full flex flex-col gap-1">
                            <div className='w-full h-1/2 flex flex-col justify-center items-center bg-white/10'> <p>Balance</p> <p>${userData.balance}</p></div>
                            <div className='w-full h-1/2 flex flex-col justify-center items-center bg-white/10'> <p>Blocked Margin</p> <p>${userData.blockedMargin}</p></div>
                        </div>
                    </div>


                    <div className="col-span-1">
                        <div className="w-full h-full bg-white/10 flex flex-col justify-center items-center">
                            <p>Equity</p>
                            <p>${Number(userData.balance + totalPnl).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="row-span-10 bg-white/10 border flex flex-1">
                </div>

            </div>
        </div>
    );
    
}