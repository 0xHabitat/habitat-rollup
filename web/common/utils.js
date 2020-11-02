import { ROOT_CHAIN_ID } from '../config.js';

export function formatString (val, expandable) {
  const str = val === undefined ? 'undefined' : val.toString();
  const child = document.createElement('p');
  child.textContent = str;

  if (expandable) {
    child.className = 'collapsed';
    child.addEventListener(
      'click',
      function (evt) {
        if (evt.target !== child) {
          return;
        }

        if (this.className.indexOf('collapsed') !== -1) {
          this.className = this.className.replace('collapsed', 'expanded');
        } else {
          this.className = this.className.replace('expanded', 'collapsed');
        }
      },
      false
    );
  }

  return child;
}

export function formatObject (obj, href) {
  const child = document.createElement('div');

  for (const key in obj) {
    const value = obj[key];
    const heading = document.createElement('kv');

    heading.className = 'sub';
    heading.id = key;
    heading.appendChild(formatString(key, false));

    const v = formatString(typeof value === 'string' ? value : JSON.stringify(value, null, 2), false);

    heading.appendChild(v);
    child.appendChild(heading);
  }

  if (href) {
    const wrapper = document.createElement('div');
    const link = document.createElement('a');
    link.className = 'button';
    link.href = href;
    link.textContent = '👉 View';
    wrapper.appendChild(link);
    child.appendChild(wrapper);
  }

  return child;
}

export function computeVotePercentages (proposal) {
  // TODO: use bignumber/bigint
  const y = Number(proposal.yesVotes);
  const n = Number(proposal.noVotes);
  const total = y + n;
  let yay = 0;
  let nay = 0;

  if (total > 0) {
    yay = y / total;
    nay = n / total;
  }

  return { yay, nay };
}

export function wrapListener (selector, func) {
  const el = document.querySelector(selector);

  el.disabled = false;
  el.addEventListener(
    'click',
    async function (evt) {
      evt.preventDefault();
      evt.target.disabled = true;

      try {
        await func(evt);
      } catch (e) {
        alert(e.toString());
      }

      evt.target.disabled = false;
    },
    false
  );
}

export function getEtherscanLink (hashOrAddress) {
  const base = ROOT_CHAIN_ID === 1 ? 'https://etherscan.io' : `https://${ethers.utils.getNetwork(ROOT_CHAIN_ID).name}.etherscan.io`;
  if (hashOrAddress.length === 66) {
    // tx hash?
      return `${base}/tx/${hashOrAddress}`;
  }

  // address
  return `${base}/address/${hashOrAddress}`;
}
