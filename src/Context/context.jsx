import React, { useEffect, useState } from "react";
import { WatchlistContext, UserAccountContext, UserEquityContext, IndicatorsList } from "../Context/context.js";
import api from "../services/api.js";
import { fetchQuote } from "../services/dataRequesterForCharts.js";
import { getWatchlist } from "../services/watchlist.js";

/*Provide the watchlist array state to all the elements
so that we can add a new element to watchlist from anywhere*/
const WatchlistProvider = (({ children }) => {
    const [watchlistArray, setWatchlistArray] = useState([]);
    useEffect(() => {
        async function fetchWatchlistData() {
            const res = await getWatchlist();
            setWatchlistArray(res.symbols);
            // console.log(watchlistArray);
        }
        fetchWatchlistData();
        const intervalID = setInterval(fetchWatchlistData, 10000);
        return () => clearInterval(intervalID);
    }, []);
    return (
        <WatchlistContext.Provider value={[watchlistArray, setWatchlistArray]}>
            {children}
        </WatchlistContext.Provider>
    );
});

/* Provider for user account information balance and blocked margin*/
const UserAccountProvider = (({ children }) => {
    const [userAccountInformation, setUserAccountInformation] = useState({
        username: "",
        email: "",
        balance: 0,
        blockedMargin: 0
    });
    useEffect(() => {
        async function collectUserAccInfo() {
            try {
                const res = await api.get("/user-data");
                const resData = res.data;
                // console.log(resData);
                setUserAccountInformation(resData);
                return;
            }
            catch (err) {
                console.log("An Error Occured while collecting userAccountInformation in context.jsx Error: ", err);
                return;
            }
        }

        collectUserAccInfo();
        const intervalId = setInterval(collectUserAccInfo, 10000);
        return () => { clearInterval(intervalId) };
    }, []);

    return (
        <UserAccountContext.Provider value={[userAccountInformation, setUserAccountInformation]}>
            {children}
        </UserAccountContext.Provider>
    );
})

/*Provider for use portfolio and pnl list */
const UserEquityProvider = (({ children }) => {
    const [userPortfolio, setUserPortfolio] = useState([]);
    const [userPnlList, setUserPnlList] = useState([]);
    const [totalPnl, setTotalPnl] = useState(0);
    const [Equity, setEquity] = useState(0);

    useEffect(() => {
        async function updateUserPnlList(portfolio) {

            try {
                if (!Array.isArray(portfolio) || portfolio.length === 0) {
                    setUserPnlList([]);
                    setTotalPnl(0);
                    return;
                }

                //collecting the current prices for all the symbols in portfolio
                const quotes = await Promise.all(portfolio.map((item) => fetchQuote(item.symbol)));
                console.log("Quotes", quotes);
                // Keep in mind that order of symbols in quotes and userPortfolio is same
                const updatedData = {}; //will store fresh calculated pnl data
                let total = Number(0); //consist the sum of pnl which will later be added to equity

                let equity = 0;
                quotes.forEach((quote, index) => {
                    const item = portfolio[index];

                    const stockPnl = Number((quote.currentPrice - item.avgPrice) * item.shares);

                    const priceChangePercent = Number(((quote.currentPrice - item.avgPrice) / item.avgPrice) * 100);

                    updatedData[item.symbol] = {
                        Pnl: stockPnl.toFixed(2),
                        pChange: item.shares >= 0 ? priceChangePercent.toFixed(2) : -1 * priceChangePercent.toFixed(2)
                    };

                    total += Number(stockPnl.toFixed(2));
                    equity = equity + quote.currentPrice * item.shares;
                });
                setUserPnlList(updatedData);
                setTotalPnl(total);
                setEquity(equity);
            }
            catch (err) {
                console.log("An error occured while collecting userPnL Error: ", err);
                return;
            }
        }

        async function updateUserPortfolio() {
            try {
                const res = await api.get("/portfolio");
                const resData = res.data;
                // console.log(resData.positions);
                const positions = resData.positions || [];
                setUserPortfolio(positions);
                await updateUserPnlList(positions);
                return;
            }
            catch (err) {
                console.log("An error occured while collecting userPortfolio Error: ", err);
                return;
            }
        }
        updateUserPortfolio();
        const intervalID = setInterval(updateUserPortfolio, 10000);
        return () => { clearInterval(intervalID) };
    }, []);
    return (
        <UserEquityContext.Provider value={
            {
                portfolio: [userPortfolio, setUserPortfolio],
                pnl: [userPnlList, setUserPnlList],
                totalPnl: [totalPnl, setTotalPnl],
                totalEquity: [Equity, setEquity]
            }
        }>{children}</UserEquityContext.Provider>
    );
})

const IndicatorsListProvider = (({ children }) => {
    const [indicatorList, setIndicatorList] = useState([]);
    return (
        <IndicatorsList.Provider value={[indicatorList, setIndicatorList]}>{children}</IndicatorsList.Provider>
    );
});




export { WatchlistProvider, UserEquityProvider, UserAccountProvider, IndicatorsListProvider };