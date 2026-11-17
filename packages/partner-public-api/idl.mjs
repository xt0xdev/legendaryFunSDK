/** Served at GET /api/v1/idl. Keep aligned with compat/launch-creation-v5/ABI.md. */
export default Object.freeze({
  schema: 1,
  name: 'legendary-factory-v5',
  version: '5',
  launchpad: 'legendary',
  cluster: 'mainnet-beta',
  address: 'Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i',
  source: 'compat/launch-creation-v5/ABI.md',
  note: 'IDL-equivalent. Not Anchor-generated. v4 LGCBUY04 bytes must be rejected.',
  instructions: Object.freeze([
    Object.freeze({ name: 'create', tag: 'LGCNEW05', bytes: 'variable', accounts: 42, partner: 'SITE_LANE' }),
    Object.freeze({
      name: 'buy',
      tag: 'LGCBUY05',
      bytes: 52,
      accounts: 27,
      args: Object.freeze(['revision u64', 'policyVersion u64', 'amount u64 gross quote in', 'minimumOut u64', 'expirySlot u64', 'globalAbsence u16', 'customAbsence u16']),
    }),
    Object.freeze({
      name: 'sell',
      tag: 'LGCSEL05',
      bytes: 52,
      accounts: 27,
      args: Object.freeze(['revision u64', 'policyVersion u64', 'amount u64 exact base in', 'minimumOut u64', 'expirySlot u64', 'globalAbsence u16', 'customAbsence u16']),
    }),
    Object.freeze({ name: 'graduate', tag: 'LGGRAD05', bytes: 100, accounts: 47 }),
  ]),
  accounts: Object.freeze([
    Object.freeze({ name: 'launch', tag: 'LGCTRV05', bytes: 1536 }),
  ]),
});
