import { secondsToString } from '/lib/utils.js';
import { getProviders, getReceipt } from '/lib/rollup.js';

export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function formatString (val) {
  const str = val === undefined ? 'undefined' : val.toString();
  const child = document.createElement('p');
  child.textContent = str;
  return child;
}

export function formatObject (obj, href) {
  const child = document.createElement('div');
  child.className = 'grid-col grid-col-2 align-left';

  for (const key in obj) {
    const value = obj[key];
    const k = formatString(key + ':');
    const v = formatString(typeof value === 'string' ? value : JSON.stringify(value, null, 2));

    k.style.color = 'var(--color-grey)';
    child.appendChild(k);
    if (href) {
      const link = document.createElement('a');
      link.href = href;
      link.appendChild(v);
      child.appendChild(link);
    } else {
      child.appendChild(v);
    }
  }

  return child;
}

export async function renderTransaction (container, hash) {
  const { childProvider } = await getProviders();
  const tx = await childProvider.send('eth_getTransactionByHash', [hash]);
  const receipt = await getReceipt(hash);
  const details = await childProvider.send('eth_getTransactionDetails', [hash])
  const block = await childProvider.getBlock(tx.blockHash);
  const obj = {
    'Included Since': `${secondsToString(~~(Date.now() / 1000) - Number(block.timestamp))}ago`,
    'Included in Block': Number(block.number),
    'Submitted on L1': block.hash !== ZERO_HASH,
    From: tx.from,
    To: tx.to,
    Index: tx.transactionIndex,
    Status: `${receipt.status} (${Number(receipt.status) === 1 ? 'ok' : 'revert/invalid'})`,
    Hash: tx.hash,
    Errno: details.errno,
    ReturnData: details.returnData,
    primaryType: tx.primaryType,
  };
  if (tx.message) {
    obj.message = tx.message;
  }

  const child = document.createElement('a');
  child.appendChild(formatObject(obj));

  if (receipt.logs.length > 0) {
    const logsHeading = document.createElement('h3');
    logsHeading.textContent = 'Transaction Logs';
    child.appendChild(logsHeading);
    child.appendChild(document.createElement('sep'));

    if (receipt.events) {
      for (const evt of receipt.events) {
        const args = {};
        for (const key in evt.args) {
          if (Number.isInteger(Number(key))) {
            continue;
          }
          args[key] = evt.args[key].toString();
        }
        const sig = formatString(evt.signature);
        sig.style.color = 'var(--color-grey)';
        child.appendChild(sig);
        child.appendChild(document.createElement('space'));
        child.appendChild(formatObject(args));
        child.appendChild(document.createElement('sep'));
      }
    } else {
      let i = 0;
      for (const log of receipt.logs) {
        const { address, topics, data } = log;
        const logElement = formatObject({ logIndex: i, address, topics, data });

        child.appendChild(logElement);
        child.appendChild(document.createElement('sep'));
        i++;
      }
    }
  }

  container.appendChild(child);
}

let lastInput;
export async function explorerSearch (evt) {
  evt.stopImmediatePropagation();
  const hashOrNumber = evt.target.value;
  const isHash = hashOrNumber.startsWith('0x') && hashOrNumber.length === 66;

  // enter
  if (isHash || evt.which === 13) {
    if (lastInput === hashOrNumber) {
      return;
    }
    lastInput = hashOrNumber;

    results.style.visibility = 'hidden';
    results.innerHTML = '';

    if (isHash) {
      try {
        const results = evt.target.parentElement.querySelector('#results');
        await renderTransaction(results, hashOrNumber);
        results.style.visibility = 'visible';
        return;
      } catch (e) {
        console.log(e);
      }
    }

    if (isHash || !!Number(hashOrNumber)) {
      try {
        const { childProvider } = await getProviders();
        const block = await childProvider.getBlock(isHash ? hashOrNumber : Number(hashOrNumber));
        if (block) {
          window.location.href = `block/#${block.hash}`;
          return;
        }
      } catch (e) {
        console.log(e);
      }
    }

    // no match - shake
    evt.target.style.animation = 'shake .5s ease-in';
    evt.target.onanimationend = () => { evt.target.style.animation = 'none'; }
  }
}
