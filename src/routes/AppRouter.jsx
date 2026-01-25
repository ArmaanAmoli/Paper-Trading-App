import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/login.jsx";
import Signup from "../pages/signup.jsx";

const AppRouter = ()=>{
    return(
        <BrowserRouter>
        <Routes>
            <Route path="/" element={<Login/>}/>
            <Route path="/signup" element={<Signup/>}/>
        </Routes>
        </BrowserRouter>
    )
}
export default AppRouter