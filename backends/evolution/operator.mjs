import { ethers } from 'ethers';
import { fetchJson } from './utils.mjs';
import TYPED_DATA from './typedData.mjs';

// TODO
// dynamic per-block pricing
// check block producer
// check finalization
// multiple gas tokens

const HISTORIC_GAS_PRICES = [
  {
    blockNumber: 1,
    value: 1000000000n,
  },
  {
    blockNumber: 142,
    value: 2500000000n,
  },
  {
    blockNumber: 156,
    value: 5000000000n,
  },
];
const { L2_RPC_URL, OPERATOR_ADDRESS, L2_RPC_API_KEY, OPERATOR_TOKEN } = process.env;
const DEFAULT_GAS_TANK_VALUE = BigInt(process.env.DEFAULT_GAS_TANK_VALUE || '0');
const QUIRK_MODE = !!process.env.QUIRK_MODE;
const QUIRKS = {
  '0x3e66327b057fc6879e5cf86bc04a3b6c8ac7b3b4': 25000000000000n,
  '0xca76df6aba919652c4f080d0ed9f1d2545225a64': 0x6f781808f980n,
  '0xfd61d925fed7c3bf871f34f4a73cbcfab06d7679': 0xa52c5bfbaaen,
};

function balanceFix (from, value) {
  const v = QUIRKS[from];
  if (!v) {
    return value;
  }

  return value - v;
}

function getGasRate (blockNum, i = 0) {
  let ret = 1n;

  for (let len = HISTORIC_GAS_PRICES.length; i < len; i++) {
    const obj = HISTORIC_GAS_PRICES[i];
    if (obj.blockNumber > blockNum) {
      break;
    }
    ret = obj.value;
  }

  return [ret, i - 1];
}

function getLatestGasRate () {
  return HISTORIC_GAS_PRICES[HISTORIC_GAS_PRICES.length - 1].value;
}

export async function getGasAccount (account) {
  // uint256 nonce, address operator, address token, uint256 amount
  const from = account.toLowerCase();
  const filter = {
    from,
    fromBlock: 1,
    primaryTypes: TYPED_DATA.primaryTypes,
  };

  try {
    const txs = await fetchJson(L2_RPC_URL, 'eth_getLogs', [filter]);
    let value = DEFAULT_GAS_TANK_VALUE;
    let consumed = 0n;
    let ratePerTx = 0n;
    let rateIndex = 0;

    for (const tx of txs) {
      const blockNum = Number(tx.blockNumber);
      [ratePerTx, rateIndex] = getGasRate(blockNum, rateIndex);
      consumed += ratePerTx;

      if (tx.primaryType === 'TributeForOperator') {
        if (tx.message.operator !== OPERATOR_ADDRESS) {
          continue;
        }
        if (OPERATOR_TOKEN && tx.message.token !== OPERATOR_TOKEN) {
          continue;
        }

        value += BigInt(tx.message.amount);
      }
    }

    value -= consumed;
    value = balanceFix(from, value);
    if (value < 0n) {
      value = 0n;
    }
    ratePerTx = getLatestGasRate();
    const remainingEstimate = value / ratePerTx;

    return { value, consumed, ratePerTx, remainingEstimate };
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}

export async function getGasTank ([account]) {
  const { value, consumed, ratePerTx, remainingEstimate } = await getGasAccount(account);

  return {
    value: `0x${value.toString(16)}`,
    consumed: `0x${consumed.toString(16)}`,
    ratePerTx: `0x${ratePerTx.toString(16)}`,
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
    const ret = await fetchJson(
      L2_RPC_URL,
      'eth_sendRawTransaction',
      [jsonOject],
      { auth: L2_RPC_API_KEY }
    );

    return { result: ret };
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}
