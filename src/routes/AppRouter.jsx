import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login.jsx";
import Signup from "../pages/signup.jsx";
import LandingPage from "../pages/landingPage.jsx";

const AppRouter = ()=>{
    return(

        <Routes>
            <Route path="/" element={<Login/>}/>
            <Route path="/signup" element={<Signup/>}/>
            <Route path="/landing-page" element={<LandingPage/>}/>
        </Routes>

    )
}
export default AppRouter