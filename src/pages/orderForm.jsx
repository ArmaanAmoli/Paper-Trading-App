import {useState } from "react";
import "./styles/orderForm.css";
import { useParams } from "react-router-dom";

import Ticker from "./ticker.jsx";
export default function OrderForm() {
    const [orderType, setOrderType] = useState('buy');
    const {ticker} = useParams();
    return (
        <div className="Order-Form">

            <h1>Order</h1>

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

            <div className="Qty">
                <input inputMode="numeric" pattern="[0-9]*" placeholder="Quantity" className="qty-input"></input>
            </div>

            <div className="market-price">
                <Ticker name={ticker} />
            </div>

            <button className="placeOrder" style={orderType === 'buy' ? { backgroundColor: '#2195f342' } : { backgroundColor: '#ff52523d' }}>Place Order</button>

        </div>
    );
}