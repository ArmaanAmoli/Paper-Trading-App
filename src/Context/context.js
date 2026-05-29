import React,{createContext} from "react";

//Provide central watchlist array to all the elements.
const WatchlistContext = createContext();

//Contains user Account balance and blocked margin.
const UserAccountContext = createContext();

//Contains user portfolio information with pnl.
const UserEquityContext = createContext();

const IndicatorsList = createContext();

const MarketData = createContext();

export {WatchlistContext , UserAccountContext , UserEquityContext , IndicatorsList , MarketData};