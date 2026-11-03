import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  it('renders a labelled password field', () => {
    render(<PasswordInput label="Password" name="password" id="password" />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toBeRequired();
  });

  it('toggles between the masked and the visible value', async () => {
    const user = userEvent.setup();

    render(<PasswordInput label="Password" name="password" id="password" />);

    const input = screen.getByLabelText('Password');
    await user.type(input, 'secret123');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('shows the error message and marks the field as invalid', () => {
    render(
      <PasswordInput label="Password" name="password" id="password" error="Password is required" />,
    );

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'password-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Password is required');
  });

  it('disables the input and the visibility toggle', () => {
    render(<PasswordInput label="Password" name="password" id="password" disabled />);

    expect(screen.getByLabelText('Password')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeDisabled();
  });

  it('forwards the ref to the input element', () => {
    const ref = createRef<HTMLInputElement>();

    render(<PasswordInput ref={ref} label="Password" name="password" id="password" />);

    expect(ref.current).toBe(screen.getByLabelText('Password'));
  });

  it('passes through additional input attributes', () => {
    render(
      <PasswordInput
        label="New password"
        name="newPassword"
        id="new-password"
        autoComplete="new-password"
        placeholder="Choose a password"
        required={false}
        minLength={8}
      />,
    );

    const input = screen.getByLabelText('New password');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
    expect(input).toHaveAttribute('placeholder', 'Choose a password');
    expect(input).toHaveAttribute('minlength', '8');
    expect(input).not.toBeRequired();
  });
});
