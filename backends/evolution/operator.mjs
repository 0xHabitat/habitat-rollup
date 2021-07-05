import { ethers } from 'ethers';
import TYPED_DATA from './typedData.mjs';

// TODO
// dynamic per-block pricing
// check block producer
// check finalization
// multiple gas tokens

const { L2_RPC_URL, OPERATOR_ADDRESS, L2_RPC_API_KEY, OPERATOR_TOKEN } = process.env;
const QUIRK_MODE = !!process.env.QUIRK_MODE;
// constant atm / 0.1 HBT
const COST_PER_TX = 1000000000n;

const QUIRKS = {
  '0x3e66327b057fc6879e5cf86bc04a3b6c8ac7b3b4': 25000000000000n,
};

function balanceFix (from, value) {
  const v = QUIRKS[from];
  if (!v) {
    return value;
  }

  return value - v;
}

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
      if (tx.message.operator !== OPERATOR_ADDRESS || tx.from !== from) {
        continue;
      }
      if (OPERATOR_TOKEN && tx.message.token !== OPERATOR_TOKEN) {
        continue;
      }

      value += BigInt(tx.message.amount);
    }

    const txCount = BigInt(await fetchJson('eth_getTransactionCount', [from]));
    const consumed = COST_PER_TX * txCount;
    value -= consumed;
    value = balanceFix(from, value);
    if (value < 0n) {
      value = 0n;
    }
    const remainingEstimate = value / COST_PER_TX;

    return { value, remainingEstimate };
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}

export async function getGasTank ([account]) {
  const { value, remainingEstimate } = await getGasAccount(account);

  return {
    value: `0x${value.toString(16)}`,
    remainingEstimate: `0x${remainingEstimate.toString(16)}`,
  };
}

function isTopUpTx (obj) {
  if (obj.primaryType !== 'TributeForOperator') {
    return false;
  }
  if (obj.message.operator !== OPERATOR_ADDRESS) {
    return false;
  }
  if (OPERATOR_TOKEN && obj.message.token !== OPERATOR_TOKEN) {
    return false;
  }

  return true;
}

function getSigner (tx) {
  const signer = ethers.utils.verifyTypedData(
    TYPED_DATA.domain,
    { [tx.primaryType]: TYPED_DATA.types[tx.primaryType] },
    tx.message,
    tx
  );

  return signer.toLowerCase();
}

export async function submitTransaction (_args, jsonOject) {
  if (!isTopUpTx(jsonOject)) {
    const from = getSigner(jsonOject);
    // check gas tank balance
    const { remainingEstimate } = await getGasAccount(from);
    if (remainingEstimate < 1n) {
      throw new Error('Please top-up the Gas Tank first');
    }
  }

  try {
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
