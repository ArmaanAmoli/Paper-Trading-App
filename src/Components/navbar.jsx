import { Link } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar" aria-label="Main navigation">
            <div className="navbar-inner">
                <div className="flex items-center gap-6">
                    <span className="navbar-brand">Paper Trading</span>
                    <nav className="navbar-nav" aria-label="Main">
                        <Link
                            to="/landing-page"
                            className={`nav-link ${isActive('/landing-page') ? 'active' : ''}`}
                            aria-label="Home"
                            aria-current={isActive('/landing-page') ? 'page' : undefined}
                        >
                            Home
                        </Link>
                        <Link
                            to="/userPortfolio"
                            className={`nav-link ${isActive('/userPortfolio') ? 'active' : ''}`}
                            aria-label="Portfolio"
                            aria-current={isActive('/userPortfolio') ? 'page' : undefined}
                        >
                            Portfolio
                        </Link>
                    </nav>
                </div>
                <div className="navbar-search" aria-label="Search">
                    <input
                        type="text"
                        placeholder="Search symbols..."
                        className="input"
                        aria-label="Search symbols"
                    />
                </div>
                <button
                    onClick={() => navigate("/userprofile")}
                    className="btn btn-icon"
                    aria-label="User profile"
                >
                    <img
                        src="https://cdn-icons-png.flaticon.com/512/6325/6325109.png"
                        alt=""
                        className="navbar-avatar"
                        aria-hidden="true"
                    />
                </button>
            </div>
        </nav>
    );
}
