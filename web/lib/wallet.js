import {
  getSigner,
  getErc20,
  wrapListener,
  renderAddress,
  renderAmount,
  walletIsConnected,
  getEtherscanTokenLink,
} from './utils.js';
import {
  HBT,
} from './config.js';

import './colorSchemeToggle.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

let walletContainer;
let tokenContract;
let account;

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

async function connect (evt) {
  await getSigner();
  update(true);
}

async function render () {
  walletContainer = document.querySelector('#wallet');

  wrapListener('#wallet button#connect', connect);
  wrapListener('#wallet button#left', visitEtherscan);
  setInterval(update, 3000);
}

window.addEventListener('DOMContentLoaded', render, false);

const TEMPLATE =
`
<section class='wrapperNav'>
  <div class='flex row center evenly' style='padding-right:3rem;'>
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
</section>`;

class HabitatNav extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
  }
}

customElements.define('habitat-nav', HabitatNav);
