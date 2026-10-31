import { useState, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  name: string;
  id: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      name,
      id,
      autoComplete = 'current-password',
      placeholder = '••••••••',
      error,
      disabled = false,
      required = true,
      minLength,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    return (
      <div className="auth-input-wrapper" style={{ position: 'relative' }}> {/* relative for absolute positioning of eye button */}
        <label htmlFor={id} className="auth-label">
          {label}
        </label>
        <div style={{ position: 'relative' }}> {/* wrapper for input + button */}
          <input
            ref={ref}
            id={id}
            type={showPassword ? 'text' : 'password'}
            name={name}
            autoComplete={autoComplete}
            placeholder={placeholder}
            className="auth-input"
            style={{ paddingRight: '44px' }} /* space for eye button */
            disabled={disabled}
            required={required}
            minLength={minLength}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-controls={id}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color var(--transition-fast), background var(--transition-fast)',
              opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              if (!disabled) e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = 'none';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-up-glow)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {showPassword ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error && (
          <p id={`${id}-error`} className="auth-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
