/**
 * 币安公开 API 获取 K 线数据
 * 免 API Key，通过 Vite 代理访问
 */

const BINANCE_API = import.meta.env.DEV
  ? '/binance-api/klines'
  : 'https://api.binance.com/api/v3/klines'

/** 市值前 20 交易对（排除稳定币） */
export const SYMBOL_OPTIONS = [
  { value: 'BTCUSDT', label: 'BTC/USDT' },
  { value: 'ETHUSDT', label: 'ETH/USDT' },
  { value: 'BNBUSDT', label: 'BNB/USDT' },
  { value: 'SOLUSDT', label: 'SOL/USDT' },
  { value: 'XRPUSDT', label: 'XRP/USDT' },
  { value: 'ADAUSDT', label: 'ADA/USDT' },
  { value: 'DOGEUSDT', label: 'DOGE/USDT' },
  { value: 'TRXUSDT', label: 'TRX/USDT' },
  { value: 'AVAXUSDT', label: 'AVAX/USDT' },
  { value: 'LINKUSDT', label: 'LINK/USDT' },
  { value: 'DOTUSDT', label: 'DOT/USDT' },
  { value: 'MATICUSDT', label: 'MATIC/USDT' },
  { value: 'SHIBUSDT', label: 'SHIB/USDT' },
  { value: 'LTCUSDT', label: 'LTC/USDT' },
  { value: 'BCHUSDT', label: 'BCH/USDT' },
  { value: 'ATOMUSDT', label: 'ATOM/USDT' },
  { value: 'UNIUSDT', label: 'UNI/USDT' },
  { value: 'NEARUSDT', label: 'NEAR/USDT' },
  { value: 'APTUSDT', label: 'APT/USDT' },
  { value: 'SUIUSDT', label: 'SUI/USDT' },
] as const

/** 可选数据周期（币安 API 单次最多 1000 条） */
export const PERIOD_OPTIONS = [
  { value: 90, label: '90 天' },
  { value: 180, label: '180 天' },
  { value: 365, label: '1 年' },
  { value: 730, label: '2 年' },
] as const

/**
 * 从币安获取日线收盘价
 * @param symbol 交易对，如 'BTCUSDT'
 * @param interval K 线级别，默认 '1d'
 * @param limit 获取条数，默认 365（币安单次最多 1000）
 * @returns 收盘价数组（从旧到新）+ 最新收盘价
 */
export async function fetchBinanceKlines(
  symbol = 'BTCUSDT',
  interval = '1d',
  limit = 365,
): Promise<{ closes: number[]; currentPrice: number }> {
  const url = `${BINANCE_API}?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`币安 API 请求失败: ${response.status} ${response.statusText}`)
  }

  const data: unknown[][] = await response.json()

  // 币安 K 线格式: [openTime, open, high, low, close, volume, ...]
  // close 在 index 4
  const closes = data.map((kline) => Number(kline[4]))
  const currentPrice = closes.length > 0 ? closes[closes.length - 1] : 0

  return { closes, currentPrice }
}

/**
 * 从收盘价序列计算年化 σ 和 μ
 * 使用日对数收益率的标准差 × √252 年化
 */
export function calculateSeriesParams(closes: number[]): {
  sigma: number
  mu: number
  dailyReturns: number[]
} {
  if (closes.length < 2) {
    return { sigma: 0.3, mu: 0, dailyReturns: [] }
  }

  const logReturns: number[] = []
  for (let i = 1; i < closes.length; i += 1) {
    const r = Math.log(closes[i] / closes[i - 1])
    if (Number.isFinite(r)) {
      logReturns.push(r)
    }
  }

  if (logReturns.length < 1) {
    return { sigma: 0.3, mu: 0, dailyReturns: [] }
  }

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
  const variance =
    logReturns.reduce((sum, r) => {
      const d = r - mean
      return sum + d * d
    }, 0) / Math.max(1, logReturns.length - 1)

  const sigmaDaily = Math.sqrt(variance)
  const sigma = sigmaDaily * Math.sqrt(252) // 年化波动率
  const mu = mean * 252 // 年化收益率

  return { sigma, mu, dailyReturns: logReturns }
}
