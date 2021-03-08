// The L2 node
export const RPC_URL = `https://0xc7185b4571c9cfa8742bbc3468cbed749137aea1.fly.dev/`;
// the root network
export const ROOT_CHAIN_ID = 3;
// min stake needed to create proposals. In units of the token, 1 = 1 * 10 ** 18 (if token.decimals = 18)
export const MIN_PROPOSAL_CREATION_STAKE = 0.1;
// The execution proxy for on-chain execution
export const EXECUTION_PROXY_ADDRESS = '0x6e2d343237A258e5a0a19f849Ee23d97386fb20c';

if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
  window.location.href = window.location.href.replace('http:', 'https:');
}
