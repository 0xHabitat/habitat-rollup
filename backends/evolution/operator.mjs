import { ethers } from 'ethers';

const L2_RPC_URL = process.env.L2_RPC_URL;
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS;
const L2_RPC_API_KEY = process.env.L2_RPC_API_KEY;

export async function getGasAccount (account) {
  // uint256 nonce, address operator, address token, uint256 amount
  const filter = {
    fromBlock: 1,
    primaryTypes: ['TributeForOperator']
  };

  try {
    const from = account.toLowerCase();
    const txs = (await ethers.utils.fetchJson(L2_RPC_URL, JSON.stringify({ id: 1, method: 'eth_getLogs', params: [filter] }))).result;
    let value = 0n;
    for (const tx of txs) {
      if (tx.message.operator.toLowerCase() !== OPERATOR_ADDRESS || tx.from.toLowerCase() !== from) {
        continue;
      }
      // todo: check token
      value += BigInt(tx.message.amount);
    }
    // todo
    const remainingEstimate = '0x' + (value / 1000000000n).toString(16);

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
