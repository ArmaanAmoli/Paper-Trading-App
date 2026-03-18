export default function SearchTabPopUp({ close }){
    return(

        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={close}>

            <div className="flex h-[37.5rem] w-[28rem] flex-col rounded-2xl border border-gray-700 bg-black px-2.5 pb-2.5" onClick={(e) => e.stopPropagation()}>

                <div className="mx-auto mt-20 flex w-[95%] flex-row items-center justify-center gap-[5px] border border-white">

                    <input className="border border-gray-600 px-[5px]" type="text" placeholder="Search..." />
                    <button className="h-10 w-10 rounded-full border border-white">S</button>
                </div>
                
            </div>
        </div>
    );
}