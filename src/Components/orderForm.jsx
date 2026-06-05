import { useState } from "react";
import "../pages/styles/orderForm.css";
import { useParams } from "react-router-dom";
import { placeOrder } from "../services/placeOrder.js";
import Ticker from "./ticker.jsx";
import { useTicker } from "../hooks/useTicker.js";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function OrderForm() {
    const [stopLossQty, setStopLossQty] = useState([]);
    const [stopLossLvl, setStopLossLvl] = useState([]);
    const [takeProfitQty, setTakeProfitQty] = useState([]);
    const [takeProfitLvl, setTakeProfitLvl] = useState([]);

    const { ticker } = useParams();
    const data = useTicker("quote", ticker);
    const [orderType, setOrderType] = useState('buy');
    const [qty, setQty] = useState();

    function handleChangeInQty(event) {
        setQty(event.target.value);
    }
    function handleChangeSlQty(event) {
        setStopLossQty(event.target.value);
    }
    function handleChangeTpQty(event) {
        setTakeProfitQty(event.target.value);
    }
    function handleChangeSlLvl(event) {
        setStopLossLvl(event.target.value);
    }
    function handleChangeTpLvl(event) {
        setTakeProfitLvl(event.target.value);
    }

    const notifySuccess = ()=> toast.success('Trade Execution Successful');
    const notifyFail = ()=> toast.error('Trade Execution Failed');

    async function placeTrade() {
        if (!(stopLossLvl || stopLossQty)) {
            await placeOrder(ticker, qty, orderType, null);
        }
        else {

            const stopLossObj = {
                symbol: ticker,
                type: orderType === 'buy' ? 'sell' : 'buy',
                qty: qty,
                price: stopLossLvl
            }

            console.log("ORDER TYPE ------------------------> ",orderType)
            const response = await placeOrder(ticker, qty, orderType, stopLossObj);
            console.log("ORDER----------------------------------->" , response)
            if(response.trade.success){
                notifySuccess();
            }
            else{
                notifyFail();
            }

        }
    }


    return (
        
        <div className="Order-Form">
            <ToastContainer />
            <h1 className="mb-2">Order</h1>

            <div className="Select-buy-sell">
                <div className="Position-type-button"
                    id="buy-side" onClick={() => { setOrderType('buy') }}
                    style={orderType === 'buy' ? { backgroundColor: '#2195f342' } : { backgroundColor: 'black' }}>
                    <h3 >BUY</h3>
                </div>
                <div className="Position-type-button" id="sell-side" onClick={() => { setOrderType('sell') }} style={orderType === 'sell' ? { backgroundColor: '#ff52523d' } : { backgroundColor: 'black' }}>
                    <h3 >SELL</h3>
                </div>
            </div>

            <div className="flex g-1 w-full mt-5">
                <div className="flex w-full justify-between"><p>Current Price </p><p>${data.currentPrice}</p></div>
            </div>

            <div className="flex w-full h-12 md:shadow-none mt-2">
                <input value={qty} onChange={handleChangeInQty} inputMode="numeric" pattern="[0-9]*" placeholder="Quantity"
                    className="w-full border-2 border-white/25 rounded-2xl px-5 active:border-2 active:border-white/30"></input>
            </div>

            <div className="flex g-1 w-full mt-2">
                <div className="flex w-full justify-between"><p>Total </p><p>${(qty ? qty * data.currentPrice : 0).toFixed(2)}</p></div>
            </div>

            <div className="flex flex-col w-full mt-5">
                <div className="flex flex-col w-full">
                    <p>Stop Loss</p>
                    <div className="flex w-full h-12 md:shadow-none mt-2">
                        <input value={stopLossLvl} onChange={handleChangeSlLvl} inputMode="numeric" pattern="[0-9]*" placeholder="Level"
                            className="w-full border-2 border-white/25 rounded-2xl px-5 active:border-2 active:border-white/30"></input>
                    </div>
                    <div className="flex w-full h-12 md:shadow-none mt-2">
                        <input value={stopLossQty} onChange={handleChangeSlQty} inputMode="numeric" pattern="[0-9]*" placeholder="Quantity"
                            className="w-full border-2 border-white/25 rounded-2xl px-5 active:border-2 active:border-white/30"></input>
                    </div>
                </div>
            </div>

            {/* <div className="flex flex-col w-full mt-5">
                <div className="flex flex-col w-full">
                    <p>Take Profit</p>
                    <div className="flex w-full h-12 md:shadow-none mt-2">
                        <input value={takeProfitLvl} onChange={setTakeProfitLvl} inputMode="numeric" pattern="[0-9]*" placeholder="Level"
                            className="w-full border-2 border-white/25 rounded-2xl px-5 active:border-2 active:border-white/30"></input>
                    </div>
                    <div className="flex w-full h-12 md:shadow-none mt-2">
                        <input value={takeProfitQty} onChange={setTakeProfitQty} inputMode="numeric" pattern="[0-9]*" placeholder="Quantity"
                            className="w-full border-2 border-white/25 rounded-2xl px-5 active:border-2 active:border-white/30"></input>
                    </div>
                </div>
            </div> */}

            <button className="flex w-full  justify-center items-center rounded-2xl h-12 mt-3" style={orderType === 'buy' ? { backgroundColor: '#2195f342' } : { backgroundColor: '#ff52523d' }}
                onClick={async () => {
                    await placeTrade();
                }}>Place Order</button>

        </div>
    );
}