import { getProviders } from '/lib/rollup.js';
import TYPED_DATA from '/lib/typedData.js';

function sortFunc (a, b) {
  const blockA = Number(a.blockNumber);
  const blockB = Number(b.blockNumber);

  if (blockA === blockB) {
    return Number(b.transactionIndex) - Number(a.transactionIndex);
  }

  return blockB - blockA;
}

async function render () {
  const { childProvider } = await getProviders();
  const filter = {
    fromBlock: 1,
    primaryTypes: ['Deposit'].concat(TYPED_DATA.primaryTypes),
  };
  const txs = (await childProvider.send('eth_getLogs', [filter])).sort(sortFunc);
  const container = document.querySelector('.transactions');

  for (let i = 0, len = txs.length; i < len; i++) {
    const tx = txs[i];
    const link = `../tx/#${tx.hash}`;

    let ele = document.createElement('a');
    ele.textContent = tx.from;
    ele.href = link;
    container.appendChild(ele);

    // tx type
    ele = document.createElement('a');
    ele.textContent = tx.primaryType || '<unknown>';
    ele.href = link;
    container.appendChild(ele);

    // hash
    ele = document.createElement('a');
    ele.textContent = tx.hash;
    ele.href = link;
    container.appendChild(ele);
  }
}

window.addEventListener('DOMContentLoaded', render, false);
