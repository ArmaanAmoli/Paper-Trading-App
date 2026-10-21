import { Link } from 'react-router-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { UserAccountContext } from '../Context/context.js';
import Avatar from './Avatar.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData] = useContext(UserAccountContext);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-inner">
        <div className="navbar-left">
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
        <div className="navbar-center">
          <div className="navbar-search" aria-label="Search">
            <input
              type="text"
              placeholder="Search symbols..."
              className="input"
              aria-label="Search symbols"
            />
          </div>
        </div>
        <div className="navbar-right">
          <button
            onClick={() => navigate('/userprofile')}
            className="navbar-profile-btn"
            aria-label="Profile"
          >
            <Avatar name={userData?.username} size={32} />
          </button>
        </div>
      </div>
    </nav>
  );
}
