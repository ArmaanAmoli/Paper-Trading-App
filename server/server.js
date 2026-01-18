import express from 'express';

const server = express();
const port = 3000;




server.listen(port, (error)=>{
    if(!error){
        console.log(`Server running on http:/localhost:${port}`)
    }else{
        console.log("An error occured, unable to start server.")
    }
});