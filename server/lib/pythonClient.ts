import axios from 'axios';
import { z } from 'zod';
import { getEnv } from './env.js';

// FastAPI response schemas
const quoteResponseSchema = z.object({
  ticker: z.string(),
  currentPrice: z.number(),
  change: z.number(),
  percentChange: z.number(),
});

export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

const ohlcvSchema = z.object({
  Date: z.string(),
  Open: z.number(),
  High: z.number(),
  Low: z.number(),
  Close: z.number(),
  Volume: z.number(),
});

export type OhlcvResponse = z.infer<typeof ohlcvSchema>;

export type OhlcvArrayResponse = OhlcvResponse[];

const searchResultSchema = z
  .object({
    symbol: z.string(),
    shortname: z.string().optional(),
    longname: z.string().optional(),
    exchDisp: z.string().optional(),
    typeDisp: z.string().optional(),
    // yfinance search returns various fields
  })
  .passthrough();

export type SearchResponse = z.infer<typeof searchResultSchema>[];

// Indicator responses
const indicatorValueSchema = z
  .object({
    Date: z.string(),
    SMA: z.number().optional(),
    EMA: z.number().optional(),
    RSI: z.number().optional(),
    Volume: z.number().optional(),
    OBV: z.number().optional(),
    BBAND_UP: z.number().optional(),
    BBAND_MIDDLE: z.number().optional(),
    BBAND_DOWN: z.number().optional(),
    SLOWK: z.number().optional(),
    SLOWD: z.number().optional(),
    // For BBAND/STOCH which return objects
    UP: z.any().optional(),
    MIDDLE: z.any().optional(),
    DOWN: z.any().optional(),
  })
  .passthrough();

export type IndicatorValueResponse = z.infer<typeof indicatorValueSchema>;

export type IndicatorArrayResponse = IndicatorValueResponse[];

// BBAND specific
const _bbandSchema = z.object({
  UP: z.array(indicatorValueSchema),
  MIDDLE: z.array(indicatorValueSchema),
  DOWN: z.array(indicatorValueSchema),
});

export type BbandResponse = z.infer<typeof _bbandSchema>;

// STOCH specific
const _stochSchema = z.object({
  SLOWK: z.array(indicatorValueSchema),
  SLOWD: z.array(indicatorValueSchema),
});

export type StochResponse = z.infer<typeof _stochSchema>;

// VOL specific (includes color)
const _volSchema = z.object({
  Date: z.string(),
  Volume: z.number(),
  color: z.string(),
});

export type VolResponse = z.infer<typeof _volSchema>;

export type VolArrayResponse = VolResponse[];

// Generic indicator response (varies by indicator)
export type IndicatorResponse =
  | IndicatorArrayResponse
  | BbandResponse
  | StochResponse
  | VolArrayResponse
  | Record<string, unknown>;

// Python client class
class PythonClient {
  private baseUrl: string;
  private axiosInstance;

  constructor() {
    const env = getEnv();
    this.baseUrl = env.FAST_API_SERVER_DOMAIN;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getQuote(ticker: string): Promise<QuoteResponse> {
    try {
      const response = await this.axiosInstance.get('/quote', {
        params: { ticker },
      });
      return quoteResponseSchema.parse(response.data);
    } catch (err) {
      console.error(`getQuote failed for ${ticker}:`, err);
      throw err;
    }
  }

  async getOhlcvData(
    ticker: string,
    period: string,
    interval: string,
  ): Promise<OhlcvArrayResponse> {
    try {
      const response = await this.axiosInstance.get('/data', {
        params: { ticker, period, interval },
      });
      // Response is already an array
      return z.array(ohlcvSchema).parse(response.data);
    } catch (err) {
      console.error(`getOhlcvData failed for ${ticker}:`, err);
      throw err;
    }
  }

  async getIndicatorData(params: {
    ticker: string;
    indicator: string;
    interval: string;
    period: string;
    timeperiod?: number;
    matype?: boolean;
    stdUp?: number;
    stdDown?: number;
    fastPeriod?: number;
    slowkPeriod?: number;
    slowkMatype?: number;
    slowdPeriod?: number;
    slowdMatype?: number;
  }): Promise<IndicatorResponse> {
    try {
      const response = await this.axiosInstance.get('/data/indicator', {
        params: params,
      });
      // The response shape varies by indicator - return raw parsed data
      return response.data as IndicatorResponse;
    } catch (err) {
      console.error(`getIndicatorData failed:`, err);
      throw err;
    }
  }

  async searchTickers(query: string): Promise<SearchResponse> {
    try {
      const response = await this.axiosInstance.get('/search', {
        params: { query },
      });
      return z.array(searchResultSchema).parse(response.data);
    } catch (err) {
      console.error(`searchTickers failed:`, err);
      throw err;
    }
  }
}

export const pythonClient = new PythonClient();
