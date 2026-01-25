// import { useState } from "react";
export default function Login(){
    return(
        <>
            <div className="login-page">
                <div className="user-details">
                    <input type="text" placeholder="Username"/>
                    <input type="email" placeholder="email"/>
                    <input type="password" placeholder="Password"/>
                </div>
                <div className="submit">
                    <button>Login</button>
                    <button>Sign-up</button>
                </div>
            </div>
        </>
    );
}