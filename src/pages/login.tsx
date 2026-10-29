import './styles/login.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import isTokenExpired from '../routes/checkTokenExpiry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface LoginResponse {
  message: string;
  token?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    email: '',
    password: '',
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token && !isTokenExpired(token)) {
      void navigate('/landing-page');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const LoginUser = async () => {
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
    }
  };

  return (
    <>
      <div className="login-page">
        <div className="login-div">
          <h1>Login</h1>
          <div className="user-details">
            <input
              className="in"
              type="email"
              name="email"
              value={userInfo.email}
              onChange={handleChange}
              placeholder="email"
            />

            <input
              className="in"
              type="password"
              name="password"
              value={userInfo.password}
              onChange={handleChange}
              placeholder="Password"
            />
          </div>

          {/* Display error message here */}
          {err && <p className="error">{err}</p>}

          <div>
            <p className="noAccount">
              Don't have an account ?&nbsp;<Link to="/signup">Signup</Link>
            </p>
          </div>

          <div className="submit">
            <button className="user-auth" onClick={LoginUser}>
              Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
