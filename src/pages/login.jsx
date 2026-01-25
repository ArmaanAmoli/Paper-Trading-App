// import { useState } from "react";
import './styles/login.css';
import Signup from './signup';
export default function Login() {
    return (
        <>
            <div className="login-page">
                
                <div className="login-div">
                    <h1>Login</h1>
                    <div className="user-details">
                        <input className="in" type="text" placeholder="Username" />
                        <input className="in" type="email" placeholder="email" />
                        <input className="in" type="password" placeholder="Password" />
                    </div>
                    <div>
                        <p className='noAccount'>Dont have an account ? <a href={Signup}>Signup</a></p>
                    </div>
                    <div className="submit">
                        <button className="user-auth">Login</button>
                    </div>
                </div>
            </div>

        </>
    );
}