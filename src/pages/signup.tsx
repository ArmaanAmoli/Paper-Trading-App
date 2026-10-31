import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import isTokenExpired from '../routes/checkTokenExpiry';
import { toast } from 'react-toastify';
import PasswordInput from '../Components/PasswordInput';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface SignupResponse {
  message: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [err, setErr] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token && !isTokenExpired(token)) {
      void navigate('/');
    }
    // Focus username input on mount
    usernameRef.current?.focus();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (err) setErr('');
    if (name === 'confirmPassword' && confirmPasswordError) {
      setConfirmPasswordError('');
    }
  };

  const validateConfirmPassword = () => {
    if (userInfo.confirmPassword && userInfo.password !== userInfo.confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleGoogleLogin = () => {
    toast.info('Google login coming soon');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateConfirmPassword()) return;
    void RegisterUser();
  };

  const RegisterUser = async () => {
    if (!userInfo.username || !userInfo.email || !userInfo.password || !userInfo.confirmPassword) return;
    
    setIsLoading(true);
    setErr('');
    setConfirmPasswordError('');
    try {
      const res = await fetch(`${API_BASE_URL}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userInfo.email,
          username: userInfo.username,
          password: userInfo.password,
        }),
      });
      const data = (await res.json()) as SignupResponse;
      console.log(data);

      if (data.message === 'User Registered') {
        void navigate('/');
      } else {
        setErr(data.message || 'Registration failed');
      }
    } catch (Error) {
      console.error(Error);
      setErr('Something went wrong please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-header">
          <div className="auth-logo">Paper Trading</div>
          <h1 className="auth-title">Create your account</h1>
        </header>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-wrapper">
            <label htmlFor="username" className="auth-label">Username</label>
            <input
              ref={usernameRef}
              id="username"
              type="text"
              name="username"
              autoComplete="username"
              value={userInfo.username}
              onChange={handleChange}
              className="auth-input"
              placeholder="johndoe"
              disabled={isLoading}
              required
            />
          </div>

          <div className="auth-input-wrapper">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              value={userInfo.email}
              onChange={handleChange}
              className="auth-input"
              placeholder="you@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <PasswordInput
            label="Password"
            name="password"
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={userInfo.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            minLength={8}
          />

          <PasswordInput
            label="Confirm password"
            name="confirmPassword"
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            value={userInfo.confirmPassword}
            onChange={handleChange}
            disabled={isLoading}
            required
            minLength={8}
            error={confirmPasswordError}
          />

          {err && <p className="auth-error" role="alert">{err}</p>}

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading || !userInfo.username || !userInfo.email || !userInfo.password || !userInfo.confirmPassword || userInfo.password !== userInfo.confirmPassword}
          >
            {isLoading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <footer className="auth-footer">
          Already have an account?{' '}
          <Link to="/">Log in</Link>
        </footer>
      </div>
    </div>
  );
}
