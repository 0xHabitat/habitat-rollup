import {
  wrapListener,
  getSigner,
  getErc20,
  walletIsConnected,
  renderAmount,
} from '/lib/utils.js';
import {
  HBT,
  EVOLUTION_ENDPOINT,
} from '/lib/config.js';

import { ethers } from '/lib/extern/ethers.esm.min.js';

const STATS_URL = `${EVOLUTION_ENDPOINT}/stats`;
const SIGNAL_URL = `${EVOLUTION_ENDPOINT}/signals`;
const SUBMIT_VOTE_URL = `${EVOLUTION_ENDPOINT}/submitVote`;
const DOMAIN_STRUCT = { name: 'Habitat Evolution', version: '1', verifyingContract: HBT };
const VOTING_STRUCT = [
  { name: 'account', type: 'address' },
  { name: 'signalStrength', type: 'uint8' },
  { name: 'shares', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'link', type: 'string' },
];
const MAX_SIGNAL = 100;
const SIGNAL_TEMPLATE =
`
<div style='height:1.5rem;overflow:hidden;'>
<a style='font-size:1.2rem;' class='bold' target='_blank' id='title'></a>
</div>
<div id='labels' class='flex row'></div>
<sep></sep>
<center style='padding-bottom:1rem;'>
<div class='circle'>
<div class='inner flex col center'>
<h1 id='signal'>-</h1>
<p>HBT</p>
</div>
</div>
<p id='totalVotes' class='text-center' style='padding:.3rem;'></p>
<p id='feedback' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
</center>

<div style="width:100%;height:1.4rem;font-size:.7rem;">
<h3 class="left inline" style="float:left;text-shadow:0 0 2px #909090;">❄️</h3>
<h3 class="right inline" style="float:right;text-shadow:0 0 2px #909090;">🔥</h3>
</div>

<habitat-slider></habitat-slider>
<label>
You can replace your vote any time.
</label>
<div class='flex row'>
<button id='vote' class='bold green'>Vote</button>
<a target='_blank' id='open' class='button smaller purple'>Open Link</a>
</div>
`;

async function fetchWrapper (...args) {
  const ret = await (await fetch(...args)).json();
  if (ret.error) {
    throw new Error(ret.error);
  }

  return ret;
}

async function updateStats () {
  const ret = await fetchWrapper(STATS_URL);
  document.querySelector('#topics').textContent = ret.totalTopics;
  document.querySelector('#members').textContent = ret.totalHolders[HBT] | 0;
  document.querySelector('#votes').textContent = ret.totalVotes;
}

function onTab (evt) {
  const target = evt.target.getAttribute('target');
  const ACTIVE = 'active';
  evt.target.parentElement.parentElement.querySelector('.active').classList.remove(ACTIVE);
  evt.target.parentElement.classList.add(ACTIVE);
  const targetSection = document.querySelector(target);
  const parentContainer = targetSection.parentElement;

  for (let i = 0, len = parentContainer.children.length; i < len; i++) {
    const section = parentContainer.children[i];
    if (section === targetSection) {
      parentContainer.style.transform = `translateX(-${100 * i}vw)`;
      break;
    }
  }
}

async function submitVote (domain, message, sig) {
  const payload = JSON.stringify({ message, sig});
  const ret = await fetchWrapper(SUBMIT_VOTE_URL, { 'method': 'POST', body: payload });

  if (ret.error) {
    throw new Error(ret.error);
  }

  return ret;
}

async function doVote ({ link, signalStrength }) {
  const erc20 = await getErc20(HBT);
  const signer = await getSigner();
  const account = await signer.getAddress();
  const balance = await erc20.balanceOf(account);
  const shares = balance.div(MAX_SIGNAL).mul(signalStrength);
  const message = {
    account,
    signalStrength,
    shares: shares.toHexString(),
    timestamp: ~~(Date.now() / 1000),
    link,
  };
  const sig = await signer._signTypedData(
    DOMAIN_STRUCT,
    { Vote: VOTING_STRUCT },
    message
  );

  const signal = await submitVote(DOMAIN_STRUCT, message, sig);
  return { signal, tokenAmount: ethers.utils.formatUnits(shares, erc20._decimals) };
}

async function updateSignal (ele, signal) {
  const link = ele.querySelector('#title');
  link.textContent = signal.title;
  link.href = signal.link;
  ele.querySelector('#open').href = signal.link;
  ele.querySelector('#totalVotes').textContent = `#Votes: ${signal.totalVotes}`;

  const labelContainer = ele.querySelector('#labels');
  labelContainer.innerHTML = '';
  for (const label of signal.labels) {
    const tmp = document.createElement('p');
    tmp.textContent = label.name;
    tmp.style['border-color'] = `#${label.color}`;
    labelContainer.appendChild(tmp);
  }

  const erc20 = await getErc20(HBT);
  if (signal.userVotingShares) {
    const amount = renderAmount(ethers.utils.formatUnits(signal.userVotingShares, erc20._decimals));
    ele.querySelector('#feedback').textContent = `You voted with ${amount} HBT.`;
  }
  const signalStrength = signal.signalStrength.toFixed(2);
  const signalElement = ele.querySelector('#signal');
  signalElement.parentElement.parentElement.style.background =
    `linear-gradient(0deg, var(--color-purple), transparent ${signalStrength}%)`;
  const totalShares = ethers.utils.formatUnits(signal.totalShares, erc20._decimals);
  signalElement.textContent = renderAmount(totalShares);

  const slider = ele.querySelector('habitat-slider');
  if (!slider.value) {
    slider.setRange(1, 100, 100, 50);
  }
}

async function updateSignalsFor (container) {
  const account = walletIsConnected() ? await (await getSigner()).getAddress() : '';
  const signals = await fetchWrapper(`${SIGNAL_URL}/${container.getAttribute('repo')}/${account}`);
  for (const signal of signals) {
    let ele = container.querySelector(`[link="${signal.link}"]`);
    if (!ele) {
      ele = document.createElement('div');
      ele.className = 'listitem';
      ele.innerHTML = SIGNAL_TEMPLATE;
      ele.setAttribute('link', signal.link);

      const slider = ele.querySelector('habitat-slider');

      wrapListener(ele.querySelector('#vote'), async function () {
        const ret = await doVote({ link: signal.link, signalStrength: Math.round(slider.value) });
        updateSignal(ele, ret.signal);
      });
      container.appendChild(ele);
    }

    updateSignal(ele, signal);
  }
}

async function updateSignals () {
  updateSignalsFor(document.querySelector('#featureSignals'));
  updateSignalsFor(document.querySelector('#improvementSignals'));
}

async function render () {
  for (const e of document.querySelectorAll('.tabs div')) {
    wrapListener(e, onTab);
  }

  setInterval(updateStats, 3000);
  setInterval(updateSignals, 10000);
  updateStats();
  updateSignals();
}

window.addEventListener('DOMContentLoaded', render, false);
