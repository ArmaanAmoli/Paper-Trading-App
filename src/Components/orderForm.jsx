import { useState } from "react";
import { useParams } from "react-router-dom";
import { placeOrder } from "../services/placeOrder.js";
import { useTicker } from "../hooks/useTicker.js";
import { toast, ToastProvider } from "../Components/Toast/Toast.jsx";
import "../pages/styles/orderFormNew.css";

export default function OrderForm({ onOrderPlaced }) {
  const [stopLossQty, setStopLossQty] = useState('');
  const [stopLossLvl, setStopLossLvl] = useState('');

  const { ticker } = useParams();
  const data = useTicker("quote", ticker);
  const [orderType, setOrderType] = useState('buy');
  const [qty, setQty] = useState('');

  function handleChangeInQty(event) {
    setQty(event.target.value);
  }
  function handleChangeSlQty(event) {
    setStopLossQty(event.target.value);
  }
  function handleChangeSlLvl(event) {
    setStopLossLvl(event.target.value);
  }

  async function placeTrade() {
    try {
      let response;
      if (!(stopLossLvl || stopLossQty)) {
        // Regular order without stop loss
        response = await placeOrder(ticker, qty, orderType, null);
      } else {
        // Order with stop loss
        const stopLossQtyNum = Number(stopLossQty);
        const stopLossLvlNum = Number(stopLossLvl);
        
        // Validate stop loss fields
        if (!Number.isFinite(stopLossQtyNum) || stopLossQtyNum <= 0) {
          toast.error('Stop loss quantity must be a positive number', { autoClose: 4000 });
          return;
        }
        if (!Number.isFinite(stopLossLvlNum) || stopLossLvlNum <= 0) {
          toast.error('Stop loss trigger price must be a positive number', { autoClose: 4000 });
          return;
        }
        
        // Order with stop loss - use stopLossQty for stop loss quantity
        const stopLossObj = {
          symbol: ticker,
          type: orderType === 'buy' ? 'sell' : 'buy',
          qty: stopLossQtyNum,
          price: stopLossLvlNum
        };
        response = await placeOrder(ticker, qty, orderType, stopLossObj);
      }
      
      // Handle trade response
      if (response?.trade?.success && response.trade.data) {
        const trade = response.trade.data;
        toast.success(
          `${orderType.toUpperCase()} order executed: ${trade?.qty || qty} ${ticker} @ $${trade?.price || data?.currentPrice?.toFixed(2)}`,
          { autoClose: 3000 }
        );
        // Clear quantity input after successful trade
        setQty('');
        // Refresh data after successful trade
        if (onOrderPlaced) onOrderPlaced();
      } else {
        const errorMsg = response?.trade?.error || response?.trade?.data?.message || 'Trade execution failed';
        toast.error(errorMsg, { autoClose: 4000 });
      }
      
      // Handle stop loss response if applicable
      if (stopLossLvl || stopLossQty) {
        if (response?.stopLoss?.success) {
          toast.info('Stop loss order placed', { autoClose: 3000 });
          // Refresh data after successful stop loss placement
          if (onOrderPlaced) onOrderPlaced();
        } else if (response?.stopLoss) {
          toast.error('Failed to place stop loss: ' + (response.stopLoss.error || 'Unknown error'), { autoClose: 4000 });
        }
      }
    } catch (err) {
      console.error('Place trade error:', err);
      toast.error(err?.response?.data?.message || err.message || 'Network error - please try again', { autoClose: 5000 });
    }
  }

  // Determine price change direction for coloring
  const priceChange = data?.change ?? 0;
  const priceChangePercent = data?.percentChange ?? 0;
  const priceDirection = priceChange > 0 ? 'positive' : priceChange < 0 ? 'negative' : 'neutral';

  // Validation
  const isQtyValid = qty && Number(qty) > 0;
  const isPriceLoaded = data?.currentPrice && data.currentPrice > 0;
  const isFormValid = isQtyValid && isPriceLoaded;

  const estimatedTotal = (qty && data?.currentPrice) ? (Number(qty) * Number(data.currentPrice)).toFixed(2) : '0.00';
  const marketPrice = data?.currentPrice ? Number(data.currentPrice).toFixed(2) : '0.00';

  return (
    <ToastProvider>
      <div className="order-form-new">
        {/* Symbol Header */}
        <div className="order-symbol-header">
          <span className="order-symbol-name">{ticker}</span>
          <div className="order-symbol-price">
            <span className={`order-current-price tabular-nums ${priceDirection}`}>${marketPrice}</span>
            <span className={`order-price-change ${priceDirection} tabular-nums`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="buy-sell-toggle" role="group" aria-label="Order side">
          <button
            type="button"
            className={`buy-sell-btn buy ${orderType === 'buy' ? 'active' : ''}`}
            onClick={() => setOrderType('buy')}
            aria-pressed={orderType === 'buy'}
          >
            BUY
          </button>
          <button
            type="button"
            className={`buy-sell-btn sell ${orderType === 'sell' ? 'active' : ''}`}
            onClick={() => setOrderType('sell')}
            aria-pressed={orderType === 'sell'}
          >
            SELL
          </button>
        </div>

        {/* Market Price (read-only) */}
        <div className="readonly-row">
          <span className="readonly-row-label">Market price</span>
          <span className={`readonly-row-value tabular-nums ${priceDirection}`}>${marketPrice}</span>
        </div>

        {/* Quantity Field */}
        <div className="form-field">
          <label htmlFor="qty-input" className="form-field-label">Quantity</label>
          <input
            id="qty-input"
            type="number"
            value={qty}
            onChange={handleChangeInQty}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Quantity"
            className="form-input"
            aria-describedby={!isQtyValid && qty ? 'qty-error' : undefined}
          />
          {!isQtyValid && qty && (
            <span id="qty-error" className="field-error">Quantity must be greater than 0</span>
          )}
        </div>

        {/* Estimated Total (read-only) */}
        <div className="readonly-row">
          <span className="readonly-row-label">Estimated total</span>
          <span className="readonly-row-value total tabular-nums">${estimatedTotal}</span>
        </div>

        {/* Stop Loss Section */}
        <div className="section-divider" aria-hidden="true" />
        <div className="stop-loss-section">
          <div className="stop-loss-header">
            <span className="stop-loss-title">Stop loss</span>
            <span className="stop-loss-optional">(optional)</span>
          </div>

          <div className="form-field">
            <label htmlFor="sl-trigger" className="form-field-label">Trigger price</label>
            <input
              id="sl-trigger"
              type="number"
              value={stopLossLvl}
              onChange={handleChangeSlLvl}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Trigger price"
              className="form-input"
              step="0.01"
            />
          </div>

          <div className="form-field">
            <label htmlFor="sl-qty" className="form-field-label">Quantity</label>
            <input
              id="sl-qty"
              type="number"
              value={stopLossQty}
              onChange={handleChangeSlQty}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Quantity"
              className="form-input"
            />
          </div>
        </div>

        {/* Place Order Button */}
        <button
          type="button"
          className={`place-order-btn ${orderType}`}
          onClick={placeTrade}
          disabled={!isFormValid}
          aria-disabled={!isFormValid}
        >
          {orderType === 'buy' ? `Buy ${ticker}` : `Sell ${ticker}`}
        </button>

        {/* Footer */}
        <p className="order-footer">Paper trading. No real money is used.</p>
      </div>
    </ToastProvider>
  );
}