export default function SearchTabPopUp({ close }){
    return(
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[1000]" onClick={close}>
            <div className="flex flex-col gap-4 w-md h-150 p-10 bg-black rounded-4xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <input className="p-2 w-[90%] mt-[20px] border border-gray-600" type="text" placeholder="Search..." ></input>
            </div>
        </div>
    );
}