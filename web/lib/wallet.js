import {
  getSigner,
  getErc20,
  wrapListener,
  renderAddress,
  renderAmount,
  walletIsConnected,
  getEtherscanTokenLink,
  getTokenName,
  getNetwork,
  getConfig,
} from './utils.js';
import {
  doQuery,
  getProviders,
  getUsername,
} from './rollup.js';
import {
  DepositFlow,
  WithdrawFlow,
  UsernameFlow,
  TransferFlow,
} from './flows.js';

import './colorSchemeToggle.js';
import './slider.js';
import './circle.js';
import './HabitatPath.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

const { HBT } = getConfig();
let walletContainer;
let tokenContract;
let account;

const ACCOUNT_TEMPLATE =
`
<div class='flex col center'>
  <div class='flex row evenly' style='width:100%;'>
  <button id='close' class='flow smaller'>Go Back</button>
    <p> </p>
    <h2>👋</h2>
    <h6 id='greeting'> </h6>
    <button id='name' class='flow smaller'>Change Username</button>
  </div>
  <sep></sep>
  <h3>Rollup Balances</h3>
  <space></space>
  <habitat-circle id='hbt' class='smaller'></habitat-circle>
  <space></space>
  <button id='deposit' class='flow'>Deposit</button>
  <space></space>
  <space></space>
  <div style='width:80ch;max-width:100%'>
    <label>
    Loading...
    <habitat-slider id='progress'></habitat-slider>
    </label>
    <space></space>
    <div id='erc20' class='align-right' style='margin:0 auto;font-family:var(--font-family-mono);max-width:fit-content;width:100ch;display:grid;gap:1rem;grid-template-columns:repeat(4, auto);'></div>
  </div>
  <space></space>
  <space></space>
  <div id='tokenActions' class='flex row' style='visibility:hidden'>
    <button id='transfer' class='flow'>⏩</button>
    <button id='withdraw' class='flow'>⏬</button>
  </div>
  <div class='flex row'>
  </div>
  <space></space>
  <div style='width:80ch;max-width:100%'>
    <div id='history' class='align-right' style='margin:0 auto;font-family:var(--font-family-mono);max-width:fit-content;width:100ch;display:grid;gap:1rem;grid-template-columns:repeat(5, auto);'></div>
  </div>
  <space></space>
  <space></space>
</div>`;

async function queryTransfers () {
  // xxx
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  // to
  let logs = await doQuery('TokenTransfer', null, null, account);
  // from
  logs = logs.concat(await doQuery('TokenTransfer', null, account));
  // todo sort and filter
  const tokens = [];
  const transfers = [];

  for (const log of logs) {
    const evt = habitat.interface.parseLog(log);
    const { token, from, to, value } = evt.args;
    const isDeposit = from === ethers.constants.AddressZero;
    const isIncoming = to === account;
    if (tokens.indexOf(token) === -1) {
      tokens.push(token);
    }
    if (transfers.findIndex((e) => e.transactionHash === log.transactionHash) === -1) {
      transfers.push(Object.assign({ token, from, to, value }, { transactionHash: log.transactionHash }));
    }
  }

  return { tokens, transfers: transfers.reverse() };
}

async function updateErc20 () {
  // xxx
  const slider = document.querySelector('habitat-slider#progress');
  const { habitat } = await getProviders();
  const { tokens, transfers } = await queryTransfers();

  {
    // render balances
    const container = document.querySelector('#erc20');
    let html = '';
    for (let i = 0, len = tokens.length; i < len; i++) {
      const tokenAddress = tokens[i];
      const erc = await getErc20(tokenAddress);
      const balance = await habitat.getErc20Balance(tokenAddress, account);
      slider.setRange(i, i, len);
      html +=
        `
        <a target='_blank' href='${getEtherscanTokenLink(tokenAddress, account)}'>${await getTokenName(tokenAddress)}</a>
        <p>${renderAmount(balance, erc._decimals)}</p>
        <button id='_transfer' class='secondary purple' token='${tokenAddress}'>Transfer</button>
        <button id='_withdraw' class='secondary purple' token='${tokenAddress}'>Withdraw</button>
        `;
    }
    container.innerHTML = html;
    const transferButton = document.querySelector('#transfer');
    const withdrawButton = document.querySelector('#withdraw');
    for (const e of container.querySelectorAll('#_transfer')) {
      wrapListener(e, (evt) => new TransferFlow(transferButton, evt.target.getAttribute('token')));
      //wrapListener(e, (evt) => new TransferFlow(evt.target, evt.target.getAttribute('token')));
    }
    for (const e of container.querySelectorAll('#_withdraw')) {
      wrapListener(e, (evt) => new WithdrawFlow(withdrawButton, evt.target.getAttribute('token')));
      //wrapListener(e, (evt) => new WithdrawFlow(evt.target, evt.target.getAttribute('token')));
    }

    document.querySelector('#tokenActions').style.visibility = tokens.length ? 'visible' : 'hidden';
  }

  {
    // transfer history
    const container = document.querySelector('#history');
    let html = '<p></p><p></p><p></p><p>From</p><p>To</p>';
    for (let i = 0, len = transfers.length; i < len; i++) {
      slider.setRange(i, i, len);
      const { token, from, to, value } = transfers[i];
      const isDeposit = from === ethers.constants.AddressZero;
      const isIncoming = to === account;
      const erc = await getErc20(token);
      const amount = renderAmount(value, erc._decimals);
      let type = 'Outgoing';

      if (isDeposit) {
        type = 'Deposit';
      } else if (isIncoming) {
        type = 'Incoming';
      }

      html +=
        `
        <p>${type}</p>
        <a target='_blank' href='${getEtherscanTokenLink(token, account)}'>${await getTokenName(token)}</a>
        <p>${amount}</p>
        <p>${await getUsername(from)}</p>
        <p>${await getUsername(to)}</p>
        `;
    }
    if (transfers.length) {
      container.innerHTML = html;
    }
  }

  slider.parentElement.style.display = 'none';
}

const ANIMATION_IN = 'blink .3s ease-in';
const ANIMATION_OUT = 'blink reverse .3s ease-out';

function animatedRemove (element) {
  element.style.animation = 'none';
  window.requestAnimationFrame(() => element.style.animation = ANIMATION_OUT);
  element.addEventListener('animationend', () => element.remove(), false);
}

async function updateAccount (container) {
  const { habitat } = await getProviders();
  const hbt = await getErc20(HBT);
  const signer = await getSigner();
  const account = await signer.getAddress();
  const hbtBalance = await habitat.getErc20Balance(HBT, account);
  const user = await getUsername(account);

  container.querySelector('#greeting').textContent = user;
  container.querySelector('#hbt').setValue(100, renderAmount(hbtBalance, hbt._decimals), 'HBT');
  await updateErc20();
}

async function maybeUpdateAccount () {
  const container = document.querySelector('overlay');
  if (!container) {
    return;
  }

  await updateAccount(container);
}

async function accountOverlay () {
  const container = document.querySelector('overlay') || document.createElement('overlay');
  container.className = 'overlay';
  container.innerHTML = ACCOUNT_TEMPLATE;
  container.style.animation = ANIMATION_IN;
  wrapListener(container.querySelector('button#close'), (evt) => {
    animatedRemove(container);
  });
  document.body.appendChild(container);

  wrapListener(container.querySelector('#transfer'), (evt) => new TransferFlow(evt.target));
  wrapListener(container.querySelector('#withdraw'), (evt) => new WithdrawFlow(evt.target));
  wrapListener(container.querySelector('#deposit'), (evt) => new DepositFlow(evt.target, maybeUpdateAccount));
  wrapListener(container.querySelector('button#name'), (evt) => new UsernameFlow(evt.target, maybeUpdateAccount));
  await maybeUpdateAccount();
}

async function update (skipInit) {
  if (!walletIsConnected()) {
    return;
  }
  if (!skipInit && !tokenContract) {
    tokenContract = await getErc20(HBT);
  }

  const signer = await getSigner();
  account = await signer.getAddress();
  const network = await signer.provider.getNetwork();

  const left = walletContainer.querySelector('#left');
  const right = walletContainer.querySelector('#right');
  const center = walletContainer.querySelector('#connect');
  let balance = 0;

  if (tokenContract) {
    const bigNum = await tokenContract.balanceOf(account);
    balance = ethers.utils.formatUnits(bigNum, tokenContract._decimals);
  }

  center.textContent = renderAddress(account);
  left.textContent = `${renderAmount(balance)} HBT`;
  right.textContent = network.name === 'homestead' ? 'mainnet' : network.name;
  walletContainer.classList.add('connected');
}

function visitEtherscan () {
  window.open(getEtherscanTokenLink(HBT, account), '_blank', ['noreferrer']);
}

async function switchNetwork () {
}

async function connect (evt) {
  if (walletContainer.classList.contains('connected') && getNetwork() !== 1) {
    await accountOverlay();
    return;
  }

  await getSigner();
  update(true);
}

async function render () {
  walletContainer = document.querySelector('#wallet');

  wrapListener('#wallet button#connect', connect);
  wrapListener('#wallet button#left', visitEtherscan);
  wrapListener('#wallet button#right', switchNetwork);
  setInterval(update, 3000);
  await update();
}

window.addEventListener('DOMContentLoaded', render, false);

const TEMPLATE =
`
<div class='wrapperNav'>
  <div class='flex row center around' style='padding-right:3rem;'>
    <div>
      <object type='image/svg+xml' style='height:64px;min-width:130px;' data='/lib/assets/logoAnimated.svg'></object>
    </div>
    <div class='flex row evenly'>
      <habitat-color-toggle style='margin:0 1em;'></habitat-color-toggle>
      <div id='wallet' class='flex row shadow'>
        <button id='left'></button>
        <button id='connect' class='connect purple flex' style='border-radius:0;'>Connect</button>
        <button id='right'></button>
      </div>
    </div>
  </div>
</div>`;

class HabitatNav extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
  }
}

customElements.define('habitat-nav', HabitatNav);
