import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import './styles/login.css';

export default function Login() {
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token")

        if (token) {
            navigate("/landing-page")
        }
    }, [navigate])

    const [err, setErr] = useState('');
    const [userInfo, setUserInfo] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserInfo((prev) => ({
            ...prev,
            [name]: value
        }));
    }
    const LoginUser = async () => {
        try {
            const res = await fetch('http://localhost:3000/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userInfo.email,
                    password: userInfo.password
                })
            });
            const data = await res.json();
            if (data.message === "Login Success") {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    console.log(data.message);
                    navigate('/landing-page');
                }
            } else {
                console.log("Wrong Password");
                setErr("Incorrect Password");
            }
        } catch (Error) {
            console.error(Error);
            setErr("Something went wrong please try again.");
        }

    }
    return (
        <>
            <div className="login-page">

                <div className="login-div">
                    <h1>Login</h1>
                    <div className="user-details">

                        <input className="in"
                            type="email"
                            name="email"
                            value={userInfo.email}
                            onChange={handleChange}
                            placeholder="email" />

                        <input className="in"
                            type="password"
                            name="password"
                            value={userInfo.password}
                            onChange={handleChange}
                            placeholder="Password" />
                    </div>

                    {/* Display error message here */}
                    {err && <p className="error">{err}</p>}

                    <div>
                        <p className='noAccount'>Don't have an account ?&nbsp;<Link to="/signup">Signup</Link></p>
                    </div>

                    <div className="submit">
                        <button className="user-auth" onClick={LoginUser}>Login</button>
                    </div>

                </div>
            </div>

        </>
    );
}