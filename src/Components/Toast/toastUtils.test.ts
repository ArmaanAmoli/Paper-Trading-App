import { afterEach, describe, expect, it } from 'vitest';
import {
  TOAST_LIMIT,
  addToRemoveQueue,
  dispatch,
  genId,
  listeners,
  reducer,
  toast,
  type ToastState,
} from './toastUtils';

const emptyState: ToastState = { toasts: [] };

afterEach(() => {
  dispatch({ type: 'REMOVE_TOAST' });
});

describe('reducer', () => {
  it('adds a toast to the front of the list', () => {
    const toastItem = { id: 'toast-1', open: true, title: 'Saved' };

    const result = reducer(emptyState, { type: 'ADD_TOAST', toast: toastItem });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('toast-1');
  });

  it('keeps at most the toast limit', () => {
    let state = emptyState;
    for (let index = 0; index < TOAST_LIMIT + 3; index += 1) {
      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: `toast-${index}`, open: true },
      });
    }

    expect(state.toasts).toHaveLength(TOAST_LIMIT);
  });

  it('updates an existing toast by id', () => {
    const state: ToastState = {
      toasts: [{ id: 'toast-1', open: true, title: 'Old title' }],
    };

    const result = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: 'toast-1', open: true, title: 'New title' },
    });

    expect(result.toasts[0].title).toBe('New title');
  });

  it('marks a single toast as closed when dismissing it by id', () => {
    const state: ToastState = {
      toasts: [
        { id: 'toast-1', open: true },
        { id: 'toast-2', open: true },
      ],
    };

    const result = reducer(state, { type: 'DISMISS_TOAST', toastId: 'toast-1' });

    expect(result.toasts[0].open).toBe(false);
    expect(result.toasts[1].open).toBe(true);
  });

  it('marks every toast as closed when dismissing without an id', () => {
    const state: ToastState = {
      toasts: [
        { id: 'toast-1', open: true },
        { id: 'toast-2', open: true },
      ],
    };

    const result = reducer(state, { type: 'DISMISS_TOAST' });

    expect(result.toasts.every((item) => !item.open)).toBe(true);
  });

  it('removes a toast by id', () => {
    const state: ToastState = {
      toasts: [
        { id: 'toast-1', open: true },
        { id: 'toast-2', open: true },
      ],
    };

    const result = reducer(state, { type: 'REMOVE_TOAST', toastId: 'toast-1' });

    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('toast-2');
  });

  it('removes every toast when no id is supplied', () => {
    const state: ToastState = {
      toasts: [
        { id: 'toast-1', open: true },
        { id: 'toast-2', open: true },
      ],
    };

    const result = reducer(state, { type: 'REMOVE_TOAST' });

    expect(result.toasts).toHaveLength(0);
  });
});

describe('dispatch', () => {
  it('notifies listeners with the updated state', () => {
    const received: ToastState[] = [];
    const listener = (state: ToastState) => {
      received.push(state);
    };

    dispatch({ type: 'ADD_TOAST', toast: { id: 'toast-1', open: true } });
    listeners.push(listener);

    try {
      dispatch({ type: 'ADD_TOAST', toast: { id: 'toast-2', open: true } });

      expect(received).toHaveLength(1);
      expect(received[0].toasts.map((item) => item.id)).toContain('toast-2');
    } finally {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }
  });
});

describe('genId', () => {
  it('returns a non-empty identifier', () => {
    expect(genId()).not.toBe('');
  });

  it('returns different identifiers on consecutive calls', () => {
    expect(genId()).not.toBe(genId());
  });
});

describe('toast helpers', () => {
  it('creates a success toast with the given description', () => {
    const result = toast.success('Order executed');

    expect(result.open).toBe(true);
    expect(result.type).toBe('success');
    expect(result.description).toBe('Order executed');
  });

  it('creates an error toast with the given description', () => {
    const result = toast.error('Trade failed');

    expect(result.type).toBe('error');
    expect(result.description).toBe('Trade failed');
  });

  it('creates an info toast with the given description', () => {
    const result = toast.info('Stop loss placed');

    expect(result.type).toBe('info');
  });

  it('creates a warning toast with the given description', () => {
    const result = toast.warning('Careful');

    expect(result.type).toBe('warning');
  });
});

describe('addToRemoveQueue', () => {
  it('schedules a removal for the toast', () => {
    expect(() => addToRemoveQueue('toast-queue-1')).not.toThrow();
  });
});
