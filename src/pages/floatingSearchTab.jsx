import { useState } from "react";
import api from "./api";
import SearchResultComponent from "./searchResultComponent";
export default function SearchTabPopUp({ close }) {
    const [userInput, setUserInput] = useState("");
    const [searchResult, setSearchResult] = useState(null);
    let key = 0;
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

        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/0 backdrop-blur-sm" onClick={close}>

            <div className="h-1/2 w-[40%] grid grid-rows-10 rounded-3xl border border-gray-700 bg-black p-3 overflow-scroll" onClick={(e) => e.stopPropagation()}>
                {/* Search Bar */}
                <div className="row-span-1 w-full grid grid-cols-10 ">

                    <input className="col-span-9 border border-gray-600/50 px-[10px] rounded-3xl"
                        type="text" value={userInput} onChange={handleChange} placeholder="Search..." />

                    <div className="col-span-1 flex justify-center items-center">
                        <button className="h-[30px] w-[30px] rounded-full bg-cover bg-no-repeat
                            bg-[url('../../src/assets/Icons/search-button.png')] cursor-pointer"
                            onClick={handleClick}></button>

                    </div>

                </div>
                {/* Search Results */}

                {/* <div className="row-span-1 width-full grid grid-cols-4">
                    <p className="col-span-1 flex justify-center items-center">Symbol</p>
                    <p className="col-span-1 flex justify-center items-center">Name</p>
                    <p className="col-span-1 flex justify-center items-center">Type</p>
                    <p className="col-span-1 flex justify-center items-center">Exchange</p>
                </div> */}

                <div className="row-span-9 grid-rows-10 w-full mt-4">
                    {searchResult && searchResult.map((ticker) => (
                        <div className="row-span-1 mt-2">
                            <SearchResultComponent info = {ticker} key= {key++}/>
                        </div>
                        
                    ))}
                </div>

            </div>
        </div>
    );
}