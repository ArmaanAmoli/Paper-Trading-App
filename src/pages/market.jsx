export default function Market() {

    return (
        <div className="w-full h-full flex flex-col border p-2">
            <h1>Markets Today</h1>
            <table className="w-full border">
                <thead className="grid grid-cols-10 gap-2 py-4">
                    <th className='col-span-1 grid justify-center items-center h-full'>S.No</th>
                    <th className='col-span-3 grid justify-center items-center h-full'>Index</th>
                    <th className='col-span-2 grid justify-center items-center h-full'>Symbol</th>
                    <th className='col-span-2 grid justify-center items-center h-full'>Price</th>
                    <th className='col-span-1 grid justify-center items-center h-full'>Daily chang</th>
                    <th className='col-span-1 grid justify-center items-center h-full'>%Chg</th>
                </thead>
                <tbody className="w-full">
                    
                </tbody>
            </table>
        </div>
    );
}