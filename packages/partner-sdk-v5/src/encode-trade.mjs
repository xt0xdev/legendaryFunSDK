/** Encode v5 52-byte buy/sell instruction data. Does not assemble accounts or sign. */
import { TAGS } from './constants.mjs';

export const TRADE_BYTES = 52;

function u64(value) {
  const n = typeof value === 'bigint' ? value : BigInt(value);
  if (n < 1n || n >= 2n ** 64n) throw new Error('INTEGER');
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(n);
  return out;
}

function u16(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 65535) throw new Error('INTEGER');
  const out = Buffer.alloc(2);
  out.writeUInt16LE(n);
  return out;
}

export function encodeTrade({
  side,
  revision,
  policyVersion,
  amount,
  minimumOut,
  expirySlot,
  globalAbsence = 0,
  customAbsence = 0,
}) {
  if (side !== 'buy' && side !== 'sell') throw new Error('SIDE');
  const data = Buffer.alloc(TRADE_BYTES);
  data.write(side === 'buy' ? TAGS.buy : TAGS.sell, 0, 8, 'ascii');
  u64(revision).copy(data, 8);
  u64(policyVersion).copy(data, 16);
  u64(amount).copy(data, 24);
  u64(minimumOut).copy(data, 32);
  u64(expirySlot).copy(data, 40);
  u16(globalAbsence).copy(data, 48);
  u16(customAbsence).copy(data, 50);
  return Uint8Array.from(data);
}
