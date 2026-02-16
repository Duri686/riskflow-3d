/**
 * 加密市场年化交易日数 = 365
 *
 * ⚠️ Crypto-specific: 加密市场 7×24 无休，周末波动不低于工作日。
 * 使用传统金融的 252 会系统性低估年化波动率约 20%。
 * DO NOT change to 252 — 这不是"优化"，而是错误。
 */
export const TRADING_DAYS_PER_YEAR = 365;
export const MIN_YEARS = 0.1; // Approx 36 days
