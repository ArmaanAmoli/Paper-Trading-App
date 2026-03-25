import api from "./api.js";

// "/user-watchlist":"http://localhost:3000",
// "/user-watchlist/add":"http://localhost:3000",

export async function addToWatchlist(symbol){
    const data = {
        symbol:symbol
    };
    try{
        const res = await api.post('/user-watchlist/add' , data);
        console.log(res.data);
        return res.data;
    }catch(err){
        console.log(`Error in add to watchlist function ${err}`);
    }
    
}

export async function getWatchlist(){
    try{
        const res = await api.get('/user-watchlist');
        return res.data[0];
    }catch(err){
        console.log(`Error in add to watchlist function ${err}`);
    }
}

export async function deleteFromWatchlist(symbol){
    const data = {
        symbol:symbol
    };
    try{
        const res = await api.delete('/user-watchlist/delete' , {data:data});
        console.log(res.data);
        return res.data;
    }catch(err){
        console.log(`Error in delete from watchlist function ${err}`);
    }
}