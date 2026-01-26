import { Link } from "react-router-dom";
import React from "react";
import './styles/navbar.css'
export default function Navbar(){
    return(
        <nav>
            <ul>
                <li><Link to = "/landing-page">Home</Link></li>
                <li><Link to = "/">Markets</Link></li>
                <li><Link to = "/">Portfolio</Link></li>
                <li><input type="text" placeholder="Search"/></li>
                <li><button>My Profile</button></li>
            </ul>
        </nav>
    );
}