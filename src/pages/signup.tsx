import './styles/login.css';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import isTokenExpired from '../routes/checkTokenExpiry';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface SignupResponse {
  message: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token && !isTokenExpired(token)) {
      void navigate('/');
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const RegisterUser = async () => {
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
    }
  };

  return (
    <>
      <div className="login-page">
        <div className="login-div">
          <h1>Signup</h1>
          <div className="user-details">
            <input
              className="in"
              type="text"
              name="username"
              value={userInfo.username}
              onChange={handleChange}
              placeholder="Username"
            />
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

            <div className="submit">
              <button className="user-auth" onClick={RegisterUser}>
                Create Account
              </button>
            </div>
          </div>

          {/* Display error message here */}
          {err && <p className="error">{err}</p>}

          <div>
            <p className="noAccount">
              Already Have an account ?&nbsp;<Link to="/">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
