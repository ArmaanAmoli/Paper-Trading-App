import api from '../services/api.js';
import { useEffect, useState, useContext } from "react";
import { UserAccountContext, UserEquityContext } from '../Context/context.js';
import { getTradeHistory } from '../services/tradeHistory.js';
import { useNavigate } from 'react-router-dom';
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

export default function UserProfile() {

    const [userData, setUserData] = useContext(UserAccountContext); // state of user personal data
    const [totalPnl, setTotalPnl] = useContext(UserEquityContext).totalPnl || 0;
    const [tradeHistory, setTradeHistory] = useState(null);
    const [Equity, setEquity] = useContext(UserEquityContext).totalEquity;
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchTradeHistory() {
            const data = await getTradeHistory();
            if (data) {
                setTradeHistory(data);
            }
        }
        fetchTradeHistory();
        const intervalId = setInterval(fetchTradeHistory, 10000);
        return () => clearInterval(intervalId);
    }, [])

    function logOut() {
        localStorage.removeItem('token');

        navigate("/", { replace: true });
    }
    return (

        <div className="w-screen h-dvh grid grid-cols-10 gap-1 grid-row-1 overflow-auto">

            <div className="grid grid-rows-10 col-span-2 sticky left-0">

                <div className="row-span-7 grid grid-rows-5">

                    <div className="row-span-2 flex flex-col justify-center items-center">
                        <div className=' text-xl font-bold'>{userData.username}</div>
                        <div>{userData.email}</div>
                        <div className='opacity-50'>{userData._id}</div>
                        <div className='opacity-50'>Member since {userData.createdAt != null ? userData.createdAt.split('T')[0] : "Loading"}</div>

                    </div>

                    <div className="row-span-2 flex flex-col gap-4 justify-center items-center">
                        <button className='shadow-[-2px_-2px_4px_0px_rgba(255,255,255,.25)] border border-white/15 h-[50px] w-[200px] rounded-3xl hover:bg-white/10'>Update Profile</button>
                        <button className='shadow-[-2px_-2px_4px_0px_rgba(255,255,255,.25)] border border-white/15 h-[50px] w-[200px] rounded-3xl hover:bg-white/10' onClick={logOut}>Log out</button>
                        <button className='shadow-[-2px_-2px_4px_0px_rgba(255,0,0,.25)] border border-red-400/15 h-[50px] w-[200px] rounded-3xl text-red-400 hover:bg-red-300/10'>Delete Account</button>
                    </div>
                </div>

            </div>

            <div className="grid grid-rows-15 col-span-8 px-2 gap-2 overflow-auto">

                <div className="grid grid-cols-2 row-span-6 gap-1">

                    <div className="col-span-1 ">
                        <div className="w-full h-full grid grid-rows-2 gap-1">
                            <div className='row-span-1 w-full  grid grid-rows-4 border border-white/10 p-2'> <div className='row-span-1 w-full flex justify-start text-xl opacity-50'>Balance</div> <div className='row-span-3 w-full flex justify-start items-center text-5xl'>${userData.balance.toLocaleString('en-US')}</div></div>
                            <div className='row-span-1 w-full  grid grid-rows-4 border border-white/10 p-2'> <div className='row-span-1 w-full flex justify-start text-xl opacity-50'>Blocked Margin</div> <div className='row-span-3 w-full flex justify-start items-center text-5xl'>${userData.blockedMargin.toLocaleString('en-US')}</div></div>
                        </div>
                    </div>


                    <div className="col-span-1 h-full">


                        <div className="w-full h-full grid grid-rows-2 gap-1">
                            <div className='row-span-1 w-full  grid grid-rows-4 border border-white/10 p-2'> <div className='row-span-1 w-full flex justify-start text-xl opacity-50'>Equity</div> <div className='row-span-3 w-full flex justify-start items-center text-5xl'>${(Number(((userData.balance) ? Number(Equity + userData.balance) : 0).toFixed(2))).toLocaleString('en-US')}</div></div>
                            <div className='row-span-1 w-full  grid grid-rows-4 border border-white/10 p-2'> <div className='row-span-1 w-full flex justify-start text-xl opacity-50'>Holdings Value</div> <div className='row-span-3 w-full flex justify-start items-center text-5xl'>${Number(Equity.toFixed(2)).toLocaleString('en-US')}</div></div>
                        </div>

                        {/* <p>Equity</p>
                            <p>${(Number(((userData.balance) ? Number(Equity + userData.balance) : 0).toFixed(2))).toLocaleString('en-US')}</p> */}
                    </div>
                </div>

                <div className="row-span-10 w-full h-full">

                    <table className='border-collapse w-full border border-white/20 grid grid-rows-10 '>
                        <thead className='row-span-1 w-full border border-white/10 sticky top-5 bg-black/20 backdrop-blur-md'>
                            <tr className='w-full grid grid-cols-10 h-full items-center'>
                                <th className='col-span-1 grid justify-center items-center h-full'>S.No</th>
                                <th className='col-span-2 grid justify-center items-center h-full'>Symbol</th>
                                <th className='col-span-2 grid justify-center items-center h-full'>Side</th>
                                <th className='col-span-1 grid justify-center items-center h-full'>#</th>
                                <th className='col-span-2 grid justify-center items-center h-full'>Released PnL</th>
                                <th className='col-span-2 grid justify-center items-center h-full'>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className='row-span-9 w-full border border-white/10'>
                            {tradeHistory && tradeHistory.length > 0 && tradeHistory.map((item, index) => {
                                const value = item.realizedPL.toFixed(2);
                                const textStyle = {
                                    color: value > 0 ? "#8bf31c" : value < 0 ? "#FF0000" : "white"
                                };
                                return (
                                    <tr className='w-full grid grid-cols-10 h-8 items-center border-b border-white/5 hover:bg-white/5' key={item.symbol + index}>
                                        <td className='col-span-1 grid justify-center items-center h-full'>{index + 1}</td>
                                        <td className='col-span-2 grid justify-center items-center h-full'>{item.symbol}</td>
                                        <td className='col-span-2 grid justify-center items-center h-full'>{item.type}</td>
                                        <td className='col-span-1 grid justify-center items-center h-full'>{item.shares}</td>
                                        <td className='col-span-2 grid justify-center items-center h-full' style={textStyle}>{item.realizedPL.toFixed(2)}</td>
                                        <td className='col-span-2 grid justify-center items-center h-full'>{new Date(item.timestamp).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>


                </div>

            </div>
        </div>
    );

}