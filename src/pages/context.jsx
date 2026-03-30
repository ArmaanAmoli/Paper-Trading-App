import React, { useEffect, useState } from "react";
import { WatchlistContext, UserAccountContext, UserEquityContext } from "./context.js";
import api from "./api.js";
import { fetchQuote } from "./Charts/dataRequester.js";

/*Provide the watchlist array state to all the elements
so that we can add a new element to watchlist from anywhere*/
const WatchlistProvider = (({ children }) => {
    const [watchlistArray, setWatchlistArray] = useState(null);
    return (
        <WatchlistContext.Provider value={[watchlistArray, setWatchlistArray]}>
            {children}
        </WatchlistContext.Provider>
    );
});

/* Provider for user account information balance and blocked margin*/
const UserAccountProvider = (({ children }) => {
    const [userAccountInformation, setUserAccountInformation] = useState(null);
    useEffect(() => {
        async function collectUserAccInfo() {
            try {
                const res = await api.get("/user-data");
                const resData = res.data;
                console.log(resData);
                setUserAccountInformation({
                    balance: resData.balance,
                    blockedMargin: resData.blockedMargin,
                });
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
    const [userPortfolio, setUserPortfolio] = useState(null);
    const [userPnlList, setUserPnlList] = useState(null);
    const [totalPnl, setTotalPnl] = useState(null);

    useEffect(() => {
        async function updateUserPnlList(portfolio) {

            try {

                //collecting the current prices for all the symbols in portfolio
                const quotes = await Promise.all(portfolio.map((item) => { fetchQuote(item.symbol) }));

                // Keep in mind that order of symbols in quotes and userPortfolio is same
                const updatedData = {}; //will store fresh calculated pnl data
                let total = 0; //consist the sum of pnl which will later be added to equity
                quotes.forEach((quote, index) => {
                    const item = portfolio[index];

                    const stockPnl = Number((quote.currentPrice - item.avgPrice) * item.shares);

                    const priceChangePercent = Number(((quote.currentPrice - item.avgPrice) / item.avgPrice) * 100);

                    updatedData[item.symbol] = {
                        Pnl: stockPnl.toFixed(2),
                        pChange: item.shares >= 0 ? priceChangePercent.toFixed(2) : -1 * priceChangePercent.toFixed(2)
                    };

                    total += stockPnl;
                });
                setUserPnlList(updatedData);
                setTotalPnl(total);
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
                setUserPortfolio(resData);
                await updateUserPnlList(resData);
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
                totalPnl: [totalPnl, setTotalPnl]
            }
        }>{children}</UserEquityContext.Provider>
    );
})

export { WatchlistProvider, UserEquityProvider, UserAccountProvider };