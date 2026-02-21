import { describe, expect, it, vi } from 'vitest'

import {
  parseBinanceKlineCloses,
  resolveKalmanBootstrapData,
} from './bootstrapData'

describe('parseBinanceKlineCloses', () => {
  it('extracts close prices from Binance kline rows', () => {
    const closes = parseBinanceKlineCloses([
      [1, '100', '120', '90', '110'],
      [2, '110', '130', '105', '125'],
    ])

    expect(closes).toEqual([110, 125])
  })

  it('skips invalid rows and non-positive prices', () => {
    const closes = parseBinanceKlineCloses([
      [1, '100', '120', '90', '0'],
      [2, '110', '130', '105', '125'],
      [3, 'x'],
      null,
      [4, '120', '140', '110', 'NaN'],
      [5, '130', '150', '120', '145'],
    ])

    expect(closes).toEqual([125, 145])
  })
})

describe('resolveKalmanBootstrapData', () => {
  it('uses Binance data when primary fetch succeeds', async () => {
    const fetchPrimary = vi.fn(async () => ({
      closes: [100, 102, 103],
      currentPrice: 103,
    }))
    const fetchFallbackJson = vi.fn(async () => [])

    const result = await resolveKalmanBootstrapData('BTCUSDT', 365, {
      fetchPrimary,
      fetchFallbackJson,
    })

    expect(fetchPrimary).toHaveBeenCalledTimes(1)
    expect(fetchFallbackJson).not.toHaveBeenCalled()
    expect(result.source).toBe('binance')
    expect(result.symbol).toBe('BTCUSDT')
    expect(result.lookbackDays).toBe(365)
    expect(result.closes).toEqual([100, 102, 103])
  })

  it('falls back to local JSON when Binance fetch fails', async () => {
    const fetchPrimary = vi.fn(async () => {
      throw new Error('network down')
    })

    const fallbackRaw = Array.from({ length: 400 }, (_, index) => [
      index,
      '0',
      '0',
      '0',
      String(100 + index),
    ])

    const fetchFallbackJson = vi.fn(async () => fallbackRaw)

    const result = await resolveKalmanBootstrapData('ETHUSDT', 365, {
      fetchPrimary,
      fetchFallbackJson,
    })

    expect(fetchPrimary).toHaveBeenCalledTimes(1)
    expect(fetchFallbackJson).toHaveBeenCalledTimes(1)
    expect(result.source).toBe('fallback')
    expect(result.symbol).toBe('BTCUSDT')
    expect(result.lookbackDays).toBe(365)
    expect(result.closes.length).toBe(365)
    expect(result.closes[0]).toBe(135)
    expect(result.closes[result.closes.length - 1]).toBe(499)
  })

  it('throws when both Binance and fallback data are unavailable', async () => {
    const fetchPrimary = vi.fn(async () => {
      throw new Error('primary failed')
    })
    const fetchFallbackJson = vi.fn(async () => [[1, '0', '0', '0', '0']])

    await expect(
      resolveKalmanBootstrapData('BTCUSDT', 365, {
        fetchPrimary,
        fetchFallbackJson,
      }),
    ).rejects.toThrow(/初始化失败/)
  })
})
