import { Link } from "react-router-dom";
import "./styles/navbar.css";

export default function Navbar() {
    return (
        <nav>
            <ul>
                <li>
                    <Link className="nav-bar-tabs" to="/landing-page">
                        Home
                    </Link>
                </li>
                <li>
                    <Link className="nav-bar-tabs" to="/">
                        Markets
                    </Link>
                </li>
                <li>
                    <Link className="nav-bar-tabs" to="/portfolio">
                        Portfolio
                    </Link>
                </li>
                <li>
                    <input type="text" placeholder="Search" className="nav-search" />
                </li>
                <li>
                    <button className="nav-profile-btn">
                        <img src="https://cdn-icons-png.flaticon.com/512/6325/6325109.png" alt="User profile picture" className="profile-pic"/>
                        </button>
                </li>
            </ul>
        </nav>
    );
}
