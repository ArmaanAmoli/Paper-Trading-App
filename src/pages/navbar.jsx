import { Link } from "react-router-dom";
// import "./styles/navbar.css";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
    const navigate = useNavigate();
    return (
        <nav className="flex w-full h-[60px] border-b border-white/20 justify-center">
            <ul className="w-full  grid grid-cols-20 gap-1">
                <li className="col-span-2 hover:bg-white/10">
                    <Link to="/landing-page" className="flex items-center justify-center 
                    w-full h-full border" >Home</Link>
                </li>
                <li className="col-span-2 hover:bg-white/10">
                    <Link to="/landing-page" className="flex items-center justify-center 
                    w-full h-full border" >Markets</Link>
                </li>
                <li className="col-span-2 hover:bg-white/10">
                    <Link className="flex items-center justify-center 
                    w-full h-full border" to="/userPortfolio">Portfolio</Link>
                </li>

                <li className="col-start-14 col-span-5">
                    <input type="text" placeholder="Search" className="w-full h-full border" />
                </li>
                <li className="col-span-2 border">
                    <button className="flex items-center justify-center w-full h-full border" onClick={()=>{navigate("/userprofile")}}>
                        <img src="https://cdn-icons-png.flaticon.com/512/6325/6325109.png" alt="User profile picture" className="h-[50px] w-[50px] rounded-full"/>
                        </button>
                </li>


            </ul>
        </nav>
    );
}
