import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useTicker } from '../hooks/useTicker';
import { placeOrder } from '../services/placeOrder';
import type { BuyResponse } from '@shared/contract/trade';
import { toast } from './Toast/toastUtils';
import OrderForm from './OrderForm';

vi.mock('../hooks/useTicker', () => ({
  useTicker: vi.fn(),
}));

vi.mock('../services/placeOrder', () => ({
  placeOrder: vi.fn(),
}));

const mockedUseTicker = vi.mocked(useTicker);
const mockedPlaceOrder = vi.mocked(placeOrder);

function spyOnToast(method: 'success' | 'error' | 'info') {
  return vi.spyOn(toast, method);
}

type ToastSpy = ReturnType<typeof spyOnToast>;

let successSpy: ToastSpy;
let errorSpy: ToastSpy;
let infoSpy: ToastSpy;

// The order quantity and the stop loss quantity share the same label text,
// so the inputs are addressed by their unique ids instead.
const orderQtyInput = () => screen.getByLabelText('Quantity', { selector: '#qty-input' });
const stopLossQtyInput = () => screen.getByLabelText('Quantity', { selector: '#sl-qty' });
const triggerPriceInput = () => screen.getByLabelText('Trigger price', { selector: '#sl-trigger' });

function renderOrderForm(ticker = 'AAPL', onOrderPlaced?: () => void) {
  return render(
    <MemoryRouter initialEntries={[`/chart/${ticker}`]}>
      <Routes>
        <Route path="/chart/:ticker" element={<OrderForm onOrderPlaced={onOrderPlaced} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const successfulTrade: BuyResponse = {
  success: true,
  message: 'Buy order executed',
  trade: {
    _id: 'trade-1',
    userId: 'user-1',
    symbol: 'AAPL',
    shares: 5,
    price: 150,
    type: 'buy',
    timestamp: '2026-01-01T00:00:00.000Z',
    realizedPL: 0,
    orderId: 'order-1',
    wasStopLoss: false,
  },
};

beforeEach(() => {
  mockedUseTicker.mockReset();
  mockedPlaceOrder.mockReset();
  mockedUseTicker.mockReturnValue({ currentPrice: 150, change: 5, percentChange: 3.33 });
  mockedPlaceOrder.mockResolvedValue({
    trade: { success: true, data: successfulTrade, error: null },
    stopLoss: { success: false, data: null, error: null },
  });

  successSpy = spyOnToast('success').mockImplementation(() => ({}) as never);
  errorSpy = spyOnToast('error').mockImplementation(() => ({}) as never);
  infoSpy = spyOnToast('info').mockImplementation(() => ({}) as never);
});

afterEach(() => {
  successSpy.mockRestore();
  errorSpy.mockRestore();
  infoSpy.mockRestore();
});

describe('OrderForm', () => {
  it('renders the symbol and the live market price', () => {
    renderOrderForm('AAPL');

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getAllByText('$150.00').length).toBeGreaterThan(0);
    expect(screen.getByText('+5.00 (+3.33%)')).toBeInTheDocument();
  });

  it('keeps the order button disabled while the market price is not available', async () => {
    const user = userEvent.setup();
    mockedUseTicker.mockReturnValue({ currentPrice: 0, change: 0, percentChange: 0 });

    renderOrderForm('AAPL');

    const orderButton = screen.getByRole('button', { name: 'Buy AAPL' });
    expect(orderButton).toBeDisabled();

    await user.type(orderQtyInput(), '5');
    expect(orderButton).toBeDisabled();
  });

  it('enables the order button once a quantity is entered with a live price', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');

    await user.type(orderQtyInput(), '5');

    expect(screen.getByRole('button', { name: 'Buy AAPL' })).toBeEnabled();
  });

  it('shows a validation error for a non positive quantity', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');

    await user.type(orderQtyInput(), '0');

    expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
  });

  it('calculates the estimated total from the quantity and the market price', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');

    await user.type(orderQtyInput(), '2');

    expect(screen.getByText('$300.00')).toBeInTheDocument();
  });

  it('places a buy order without a stop loss', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(mockedPlaceOrder).toHaveBeenCalledWith('AAPL', 5, 'buy', null);
    });
    expect(successSpy).toHaveBeenCalledWith(
      'BUY order executed: 5 AAPL @ 150.00',
      expect.objectContaining({ autoClose: 3000 }),
    );
  });

  it('places a sell order when the sell side is selected', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');
    await user.click(screen.getByRole('button', { name: 'SELL' }));
    await user.type(orderQtyInput(), '2');
    await user.click(screen.getByRole('button', { name: 'Sell AAPL' }));

    await waitFor(() => {
      expect(mockedPlaceOrder).toHaveBeenCalledWith('AAPL', 2, 'sell', null);
    });
  });

  it('clears the quantity and notifies the parent after a successful order', async () => {
    const user = userEvent.setup();
    const onOrderPlaced = vi.fn();

    renderOrderForm('AAPL', onOrderPlaced);
    await user.type(orderQtyInput(), '5');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(onOrderPlaced).toHaveBeenCalledTimes(1);
    });
    expect(orderQtyInput()).toHaveValue(null);
  });

  it('rejects a stop loss with a non positive quantity', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.type(triggerPriceInput(), '100');
    await user.type(stopLossQtyInput(), '0');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Stop loss quantity must be a positive number',
        expect.objectContaining({ autoClose: 4000 }),
      );
    });
    expect(mockedPlaceOrder).not.toHaveBeenCalled();
  });

  it('rejects a stop loss with a non positive trigger price', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.type(triggerPriceInput(), '0');
    await user.type(stopLossQtyInput(), '2');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Stop loss trigger price must be a positive number',
        expect.objectContaining({ autoClose: 4000 }),
      );
    });
    expect(mockedPlaceOrder).not.toHaveBeenCalled();
  });

  it('places an order with a sell stop loss for a buy order', async () => {
    const user = userEvent.setup();

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.type(triggerPriceInput(), '100');
    await user.type(stopLossQtyInput(), '2');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(mockedPlaceOrder).toHaveBeenCalledTimes(1);
    });

    const call = mockedPlaceOrder.mock.calls[0];
    expect(call[0]).toBe('AAPL');
    expect(call[1]).toBe(5);
    expect(call[2]).toBe('buy');

    const stopLoss = call[3];
    expect(stopLoss).not.toBeNull();
    if (!stopLoss) return;
    expect(stopLoss.symbol).toBe('AAPL');
    expect(stopLoss.type).toBe('sell');
    expect(stopLoss.qty).toBe(2);
    expect(stopLoss.price).toBe(100);
    expect(typeof stopLoss.startDate).toBe('string');
  });

  it('reports an error toast when the trade fails', async () => {
    const user = userEvent.setup();
    mockedPlaceOrder.mockResolvedValue({
      trade: { success: false, data: null, error: 'Insufficient funds' },
      stopLoss: { success: false, data: null, error: null },
    });

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Insufficient funds',
        expect.objectContaining({ autoClose: 4000 }),
      );
    });
  });

  it('reports a network error toast when the request throws', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPlaceOrder.mockRejectedValue(new Error('Network Error'));

    renderOrderForm('AAPL');
    await user.type(orderQtyInput(), '5');
    await user.click(screen.getByRole('button', { name: 'Buy AAPL' }));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        'Network Error',
        expect.objectContaining({ autoClose: 5000 }),
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
