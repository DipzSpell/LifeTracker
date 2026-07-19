/**
 * lotSizes.js — NSE F&O lot-size config.
 *
 * LOT SIZE = units per lot, fixed per symbol by the exchange.
 * LOTS = how many lots the trader takes (user input).
 * QUANTITY = LOTS × LOT_SIZE.
 *
 * ⚠️ NSE revises lot sizes periodically (last revision: Jan 2026 —
 * NIFTY 75→65, BANKNIFTY 35→30). Values below are current as of Jul 2026.
 * The trade form auto-fills from this map but keeps the Lot Size field
 * editable so the user can override when the exchange revises again.
 * Unknown symbols (stock F&O not listed here) and Equity trades fall
 * back to DEFAULT_LOT_SIZE.
 */
export const LOT_SIZES = {
  NIFTY: 65,
  BANKNIFTY: 30,
  FINNIFTY: 60,
  MIDCPNIFTY: 140,
  NIFTYNXT50: 25,
  SENSEX: 20,
  BANKEX: 30,
}

export const DEFAULT_LOT_SIZE = 1
