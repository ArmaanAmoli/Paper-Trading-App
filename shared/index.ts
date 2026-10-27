export * from './contract/define.js';
export {
  signUpEndpoint,
  loginEndpoint,
  userDataEndpoint,
  saveSubscriptionEndpoint as authSaveSubscriptionEndpoint,
  type SignUpBody,
  type SignUpResponse,
  type LoginBody,
  type LoginResponse,
  type UserDataResponse,
  type SaveSubscriptionBody as AuthSaveSubscriptionBody,
  type SaveSubscriptionResponse as AuthSaveSubscriptionResponse,
} from './contract/auth.js';

// Trade exports (primary source for trade-related types)
export {
  buyEndpoint,
  sellEndpoint,
  stopLossEndpoint,
  getStopLossEndpoint,
  deleteStopLossEndpoint,
  tradeHistoryEndpoint,
  portfolioEndpoint,
  type BuyBody,
  type BuyResponse,
  type SellBody,
  type SellResponse,
  type StopLossBody,
  type StopLossResponse,
  type GetStopLossResponse,
  type DeleteStopLossResponse,
  type TradeHistoryResponse,
  type PortfolioResponse,
} from './contract/trade.js';

// Watchlist exports (primary source for watchlist-related types)
export {
  userWatchlistEndpoint,
  addToWatchlistEndpoint,
  deleteFromWatchlistEndpoint,
  type UserWatchlistResponse,
  type AddToWatchlistBody,
  type AddToWatchlistResponse,
  type DeleteFromWatchlistBody,
  type DeleteFromWatchlistResponse,
} from './contract/watchlist.js';

// Market exports (market-specific types not in trade/watchlist/auth)
export {
  quoteEndpoint,
  dataEndpoint,
  searchEndpoint,
  indicatorEndpoint,
  stopLossMarketEndpoint,
  portfolioMarketEndpoint,
  tradeHistoryMarketEndpoint,
  watchlistEndpoint,
  type QuoteQuery,
  type QuoteResponse,
  type DataQuery,
  type DataResponse,
  type SearchQuery,
  type SearchResponse,
  type IndicatorQuery,
  type IndicatorResponse,
  type StopLossQuery,
  type StopLossResponse as MarketStopLossResponse,
  type PortfolioResponse as MarketPortfolioResponse,
  type TradeHistoryResponse as MarketTradeHistoryResponse,
} from './contract/market.js';

export * from './contract/push.js';
export * from './contract/wsMessages.js';
