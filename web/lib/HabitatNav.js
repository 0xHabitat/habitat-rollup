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
  getAttributes,
} from './utils.js';
import {
  doQuery,
  getProviders,
  getUsername,
  getExitStatus,
  getBlockExplorerLink,
  queryTransfers,
} from './rollup.js';
import {
  DepositFlow,
  WithdrawFlow,
  UsernameFlow,
  TransferFlow,
} from './flows.js';

import './HabitatColorToggle.js';
import './HabitatSlider.js';
import './HabitatCircle.js';
import './HabitatPath.js';
import './HabitatStakes.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

const { HBT } = getConfig();
const ANIMATION_IN = 'blink .3s ease-in';
const ANIMATION_OUT = 'blink reverse .3s ease-out';
let walletContainer;
let tokenContract;
let account;

const ACCOUNT_ERC20_TEMPLATE =
`
<a target='_blank'></a>
<p></p>
<p></p>
<button id='_transfer' class='secondary purple'>Transfer</button>
<button id='_withdraw' class='secondary purple'>Withdraw</button>
<button id='_fastWithdraw' class='secondary purple' disabled>Fast Withdraw</button>
`;

const ACCOUNT_EXITS_TEMPLATE =
`
<a target='_blank'></a>
<p></p>
<p></p>
<button id='_withdraw' class='secondary purple'>Withdraw from Bridge</button>
`;

const ACCOUNT_TRANSFER_TEMPLATE =
`
<p></p>
<a target='_blank'></a>
<p></p>
<p></p>
<p></p>
<a target='_blank'></a>
`;

const ACCOUNT_TEMPLATE =
`
<style>
#erc20 > div, #history > div, #exits > div {
  margin:0 auto;
  font-family:var(--font-family-mono);
  max-width:fit-content;
  width:100ch;
  display:grid;
  gap:1rem;
  grid-template-columns:repeat(5, auto);
}
#erc20 > div {
  grid-template-columns:repeat(6, auto);
}
#history > div {
  grid-template-columns:repeat(6, auto);
}
#exits > div {
  grid-template-columns:repeat(4, auto);
}
.tabs > div {
  border-bottom: 3px solid transparent;
}
.tabs > div.active {
  border-bottom-color: var(--color-bg-invert);
}
</style>
<div class='flex row evenly' style='width:100%;'>
  <button id='close' class='flow smaller'>Go Back</button>
  <p> </p>
  <h6 id='greeting'> </h6>
  <button id='name' class='flow smaller'>Change Username</button>
</div>
<sep></sep>
<section>
  <div class='flex row center tabs' style='gap:.5em;'>
    <div class='active'>
      <a target='#wallet-overview' class='bold secondary purple'>Overview</a>
    </div>
    <div>
      <a target='#wallet-activity' class='bold secondary purple'>Activity</a>
    </div>
    <div>
      <a target='#wallet-stakes' class='bold secondary purple'>Stakes</a>
    </div>
    <div>
      <a target='#wallet-delegation' class='bold secondary purple'>Delegation</a>
    </div>
  </div>
</section>

<space></space>

<section class='tabcontainer'>
  <section class='tab' id='wallet-overview'>
    <div class='flex col center'>
      <h3>Rollup Balances</h3>
      <space></space>
      <habitat-circle id='hbt' class='smaller'></habitat-circle>
      <space></space>
      <button id='deposit' class='flow'>Deposit</button>
      <space></space>
      <space></space>
      <div style='width:42ch;max-width:100%'>
        <label>Loading...<habitat-slider id='progress'></habitat-slider></label>
      </div>
      <space></space>
      <div style='width:80ch;max-width:100%'>
        <div id='erc20'></div>
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
        <h3>Withdraw from Habitat</h3>
        <div id='exits'></div>
        <space></space>
      </div>
      <space></space>
      <space></space>
    </div>
  </section>

  <section class='tab' id='wallet-activity'>
    <div class='flex col evenly center left padh'>
      <div style='width:80ch;max-width:100%'>
        <div id='history'></div>
      </div>
    </div>
  </section>

  <section class='tab' id='wallet-stakes'>
    <habitat-stakes></habitat-stakes>
  </section>

  <section class='tab' id='wallet-delegation'>
    <h3>Nothing to see here yet</h3>
  </section>
</section>
`;

const NAV_TEMPLATE =
`
<div class='wrapperNav'>
  <div class='flex row center around' style='padding-right:3rem;'>
    <div class='flex col left' style='align-items:flex-start;'>
      <object type='image/svg+xml' style='height:64px;min-width:130px;' data='/lib/assets/logoAnimated.svg'></object>
      <button id='add747' style='margin:0;' class='secondary purple smaller noHover'>Add HBT to MetaMask</button>
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

async function updateErc20 () {
  // xxx
  const slider = document.querySelector('habitat-slider#progress');
  slider.parentElement.style.display = 'revert';
  const { habitat, bridge } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const { tokens, transfers } = await queryTransfers(account);
  const callback = maybeUpdateAccount;

  {
    // testnet
    if (habitat.provider._network && habitat.provider._network !== 1) {
      if (tokens.indexOf(HBT) === -1) {
        tokens.push(HBT);
      }
    }
  }

  document.querySelector('#tokenActions').style.visibility = tokens.length ? 'visible' : 'hidden';

  if (!tokens.length) {
    slider.parentElement.style.display = 'none';
    return;
  }

  {
    // render balances
    const child = document.createElement('div');
    child.className = 'align-right';
    child.innerHTML = ACCOUNT_ERC20_TEMPLATE.repeat(tokens.length);
    const children = child.children;
    let childPtr = 0;
    for (let i = 0, len = tokens.length; i < len; i++) {
      slider.setRange(i, i, len);
      const token = tokens[i];
      const erc = await getErc20(token);
      const balance = await habitat.getBalance(token, account);
      const tokenName = await getTokenName(token);
      const stakedBalance = await habitat.getActiveVotingStake(token, account);
      children[childPtr].textContent = tokenName;
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      children[childPtr++].textContent = renderAmount(balance, erc._decimals);
      children[childPtr++].textContent = `${renderAmount(stakedBalance, erc._decimals)} Staked`;
      // transfer
      wrapListener(children[childPtr++], (evt) => new TransferFlow(document.querySelector('button#transfer'), { callback, token }));
      // withdraw
      wrapListener(children[childPtr++], (evt) => new WithdrawFlow(document.querySelector('button#withdraw'), { callback, token }));
      // fastwithdraw
      children[childPtr++].setAttribute('token', token);
    }
    const container = document.querySelector('#erc20');
    if (container) {
      container.replaceChildren(child);
    }
  }

  {
    // exits
    const child = document.createElement('div');
    child.className = 'align-right';
    child.innerHTML = ACCOUNT_EXITS_TEMPLATE.repeat(tokens.length);
    const children = child.children;
    let childPtr = 0;
    for (let i = 0, len = tokens.length; i < len; i++) {
      slider.setRange(i, i, len);
      const token = tokens[i];
      const { pendingAmount, availableAmount } = await getExitStatus(token, account);

      const erc = await getErc20(token);
      const amount = ethers.utils.formatUnits(availableAmount, erc._decimals);
      const disabled = !availableAmount.gt(0);

      children[childPtr].textContent = await getTokenName(token);
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      children[childPtr++].textContent = `${renderAmount(pendingAmount, erc._decimals)} pending`;
      children[childPtr++].textContent = `${renderAmount(availableAmount, erc._decimals)} available`;
      // withdraw
      wrapListener(children[childPtr], (evt) => new WithdrawFlow(document.querySelector('button#withdraw'), { callback, amount, token }));
      children[childPtr++].disabled = disabled;
    }
    const container = document.querySelector('#exits');
    if (container) {
      container.replaceChildren(child);
    }
  }

  if (transfers.length) {
    // transfer history
    const child = document.createElement('div');
    child.className = 'align-right';
    child.innerHTML = '<p></p><p></p><p></p><p>From</p><p>To</p><p>Transaction</p>' + ACCOUNT_TRANSFER_TEMPLATE.repeat(transfers.length);
    const children = child.children;
    let childPtr = 6;
    for (let i = 0, len = transfers.length; i < len; i++) {
      slider.setRange(i, i, len);
      const { token, from, to, value, transactionHash } = transfers[(len - 1) - i];
      const isDeposit = from === ethers.constants.AddressZero;
      const isIncoming = to === account;
      const isExit = to === ethers.constants.AddressZero;
      const erc = await getErc20(token);
      const amount = renderAmount(value, erc._decimals);
      let type = 'Outgoing';

      if (isDeposit) {
        type = 'Deposit';
      } else if (isExit) {
        type = 'Exit';
      } else if (isIncoming) {
        type = 'Incoming';
      }

      // type
      children[childPtr++].textContent = type;
      // token
      children[childPtr].textContent = await getTokenName(token);
      children[childPtr++].href = getEtherscanTokenLink(token, account);
      // amount
      children[childPtr++].textContent = amount;
      // from
      children[childPtr++].textContent = await getUsername(from);
      // to
      children[childPtr++].textContent = await getUsername(to);
      // block explorer link
      children[childPtr].textContent = renderAddress(transactionHash);
      children[childPtr++].href = getBlockExplorerLink(transactionHash);
    }
    const container = document.querySelector('#history');
    if (container) {
      container.replaceChildren(child);
    }
  }

  slider.parentElement.style.display = 'none';
}

function animatedRemove (element) {
  element.addEventListener('animationend', () => element.remove(), false);
  window.requestAnimationFrame(
    function () {
      element.style.animation = 'none';
      window.requestAnimationFrame(() => element.style.animation = ANIMATION_OUT);
    }
  );
}

async function updateAccount (container) {
  const { habitat } = await getProviders();
  const hbt = await getErc20(HBT);
  const signer = await getSigner();
  const account = await signer.getAddress();
  const hbtBalance = await habitat.getBalance(HBT, account);
  const user = await getUsername(account, true);

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
  for (const e of container.querySelectorAll('.tabs div > a')) {
    wrapListener(e, onTab);
  }

  document.body.appendChild(container);

  wrapListener(container.querySelector('#transfer'), (evt) => new TransferFlow(evt.target));
  wrapListener(container.querySelector('#withdraw'), (evt) => new WithdrawFlow(evt.target));
  wrapListener(container.querySelector('#deposit'), (evt) => new DepositFlow(evt.target, { callback: maybeUpdateAccount }));
  wrapListener(container.querySelector('button#name'), (evt) => new UsernameFlow(evt.target, { callback: maybeUpdateAccount }));
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

function onTab (evt) {
  const ACTIVE = 'active';
  const target = evt.target.getAttribute('target');
  const targetSection = document.querySelector(target);
  const parentContainer = targetSection.parentElement;

  evt.target.parentElement.parentElement.querySelector('.active').classList.remove(ACTIVE);
  evt.target.parentElement.classList.add(ACTIVE);

  for (let i = 0, len = parentContainer.children.length; i < len; i++) {
    const section = parentContainer.children[i];
    if (section === targetSection) {
      parentContainer.style.transform = `translateX(-${100 * i}vw)`;
      break;
    }
  }
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

class HabitatNav extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = NAV_TEMPLATE;

    wrapListener(
      this.querySelector('#add747'),
      async () => {
        // EIP-747
        const signer = await getSigner();
        await signer.provider.send(
          'metamask_watchAsset',
          {
            type: 'ERC20',
            options: {
              address: HBT,
              symbol: 'HBT',
              decimals: 10,
              image: 'https://0xhabitat.org/lib/assets/logo.png',
            }
          }
        );
      }
    );
  }
}

customElements.define('habitat-nav', HabitatNav);
