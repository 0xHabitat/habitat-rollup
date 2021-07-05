import { ethers } from 'ethers';

// TODO
// dynamic per-block pricing
// check block producer
// check finalization
// multiple gas tokens

const { L2_RPC_URL, OPERATOR_ADDRESS, L2_RPC_API_KEY, OPERATOR_TOKEN } = process.env;
// constant atm / 0.1 HBT
const COST_PER_TX = 1000000000n;

async function fetchJson (method, params) {
  const resp = await ethers.utils.fetchJson(L2_RPC_URL, JSON.stringify({ id: 1, method, params }));
  if (resp.error) {
    throw new Error(resp.error.message);
  }
  return resp.result;
}

export async function getGasAccount (account) {
  // uint256 nonce, address operator, address token, uint256 amount
  const filter = {
    fromBlock: 1,
    primaryTypes: ['TributeForOperator']
  };

  try {
    const from = account.toLowerCase();
    const txs = await fetchJson('eth_getLogs', [filter]);
    let value = 0n;
    for (const tx of txs) {
      if (tx.message.operator.toLowerCase() !== OPERATOR_ADDRESS || tx.from.toLowerCase() !== from) {
        continue;
      }
      if (OPERATOR_TOKEN && tx.message.token.toLowerCase() !== OPERATOR_TOKEN) {
        continue;
      }

      value += BigInt(tx.message.amount);
    }

    const txCount = BigInt(await fetchJson('eth_getTransactionCount', [from]));
    const consumed = COST_PER_TX * txCount;
    let remaining = (value / COST_PER_TX) - consumed;
    if (remaining < 0n) {
      // todo
      remaining = 0n;
    }
    const remainingEstimate = '0x' + remaining.toString(16);

    return { value: '0x' + value.toString(16), remainingEstimate };
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}

export async function getGasTank ([account]) {
  return getGasAccount(account);
}

export async function submitTransaction (_args, jsonOject) {
  try {
    // todo check gas balance
    const ret = await ethers.utils.fetchJson(
      L2_RPC_URL,
      JSON.stringify({ id: 1, auth: L2_RPC_API_KEY, method: 'eth_sendRawTransaction', params: [jsonOject] })
    );

    return ret;
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}
