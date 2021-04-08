import { secondsToString } from '/lib/utils.js';
import { getProviders } from '/lib/rollup.js';

async function render () {
  const { childProvider } = await getProviders();
  const hash = window.location.hash.replace('#', '');
  const block = await childProvider.send('eth_getBlockByHash', [hash, true]);
  const container = document.querySelector('.transactions');
  const time = secondsToString(~~(Date.now() / 1000) - Number(block.timestamp));

  document.querySelector('#status').textContent = `Block #${Number(block.number)} | ${time}ago`;
  for (let i = 0, len = block.transactions.length; i < len; i++) {
    const tx = block.transactions[i];
    const link = `../tx/#${tx.hash}`;

    let ele = document.createElement('a');
    ele.textContent = i;
    ele.href = link;
    container.appendChild(ele);

    ele = document.createElement('a');
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
