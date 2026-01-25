import './styles/login.css'
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';



export default function Signup() {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({
        username: '',
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const RegisterUser = async () => {
        const res = await fetch("http://localhost:3000/sign-up", { //########################################################################
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: userInfo.email,
                username: userInfo.username,
                password: userInfo.password
            })
        });
        const data = await res.json();
        console.log(data);
        
        if(data.message ==="User Registered"){
            navigate('/')
        }
    }

    return (
        <div className="login-page">
            <div className="login-div">

                <h1>Signup</h1>
                <div className="user-details">
                    <input className="in"
                        type="text"
                        name='username'
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
                        placeholder="email" />

                    <input
                        className="in"
                        type="password"
                        name="password"
                        value={userInfo.password}
                        onChange={handleChange}
                        placeholder="Password" />

                    <div className="submit">
                        <button className="user-auth" onClick={RegisterUser}>Create Account</button>
                    </div>
                </div>
                <div>
                    <p className='noAccount'>Already Have an account ?&nbsp;<Link to="/">Login</Link></p>
                </div>


            </div>
        </div>
    );
}