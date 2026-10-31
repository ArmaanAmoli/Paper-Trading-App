import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import isTokenExpired from '../routes/checkTokenExpiry';
import { toast } from 'react-toastify';
import PasswordInput from '../Components/PasswordInput';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface LoginResponse {
  message: string;
  token?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const [userInfo, setUserInfo] = useState({
    email: '',
    password: '',
  });
  const [err, setErr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Check for token in URL (from Google OAuth callback)
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Remove token from URL
      setSearchParams({}, { replace: true });
      void navigate('/landing-page', { replace: true });
      return;
    }

    // Check for error from Google OAuth
    const error = searchParams.get('error');
    if (error === 'google_failed') {
      setErr('Google sign-in failed. Please try again.');
      setSearchParams({}, { replace: true });
    }

    // Check for existing valid token in localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken && !isTokenExpired(storedToken)) {
      void navigate('/landing-page');
    }
    // Focus email input on mount
    emailRef.current?.focus();
  }, [navigate, searchParams, setSearchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (err) setErr('');
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // Full page redirect to backend's Google OAuth endpoint
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void LoginUser();
  };

  const LoginUser = async () => {
    if (!userInfo.email || !userInfo.password) return;
    
    setIsLoading(true);
    setErr('');
    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userInfo.email,
          password: userInfo.password,
        }),
      });
      const data = (await res.json()) as LoginResponse;
      console.log(data);

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        void navigate('/landing-page', { replace: true });
      } else {
        setErr(data.message || 'Invalid credentials');
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
          <h1 className="auth-title">Log in to Paper Trading</h1>
        </header>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={isLoading || googleLoading}
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
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="auth-divider">or</div>

        {err && <p className="auth-error" role="alert">{err}</p>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-input-wrapper">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              ref={emailRef}
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
            autoComplete="current-password"
            placeholder="••••••••"
            value={userInfo.password}
            onChange={handleChange}
            disabled={isLoading}
            required
            error={err}
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading || !userInfo.email || !userInfo.password}
          >
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <footer className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Sign up</Link>
        </footer>
      </div>
    </div>
  );
}
