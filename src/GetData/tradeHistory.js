import api from "./api.js";

async function getTradeHistory(){
    try{
        const res = await api.get('/trade-history');
        console.log(res.data); // To Be Removed
        return (res.data);
    }catch(err){
        console.log("Error occured while catching user trade history: " , err);
        return false;
    }
}

export {getTradeHistory};