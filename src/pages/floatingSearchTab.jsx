import { useState } from "react";
import api from "./api";

export default function SearchTabPopUp({ close }) {
    const [userInput, setUserInput] = useState("");
    const [searchResult, setSearchResult] = useState(null);

    const handleChange = (event) => {
        setUserInput(event.target.value);
    };

    async function handleClick() {
        const res = await api.get("/search", {
            params: {
                query: String(userInput),
            }
        }

        );
        console.log(res.data)
        setSearchResult(res.data);
    };
    return (

        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={close}>

            <div className="h-[37.5rem] w-[28rem] grid grid-rows-10 rounded-3xl border border-gray-700 bg-black p-3" onClick={(e) => e.stopPropagation()}>

                <div className="row-span-1 w-full grid grid-cols-10 ">

                    <input className="col-span-9 border border-gray-600/50 px-[10px] rounded-3xl"
                        type="text" value={userInput} onChange={handleChange} placeholder="Search..." />

                    <div className="col-span-1 flex justify-center items-center">
                        <button className="h-[30px] w-[30px] rounded-full bg-cover bg-no-repeat
                            bg-[url('../../src/assets/Icons/search-button.png')] cursor-pointer"
                            onClick={handleClick}></button>
                    </div>

                </div>

            </div>
        </div>
    );
}