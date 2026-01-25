import './styles/login.css'
import { Link } from 'react-router-dom';

export default function Signup() {
    return (
        <div className="login-page">
            <div className="login-div">
                <h1>Signup</h1>
                <div className="user-details">
                    <input className="in" type="text" placeholder="Username" />
                    <input className="in" type="email" placeholder="email" />
                    <input className="in" type="password" placeholder="Password" />
                </div>
                <div>
                    <p className='noAccount'>Already Have an account ?&nbsp;<Link to="/">Login</Link></p>
                </div>
                <div className="submit">
                    <button className="user-auth">Create Account</button>
                </div>
            </div>
        </div>
    );
}