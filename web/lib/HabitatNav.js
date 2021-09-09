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

import './HabitatColorToggle.js';
import './HabitatSlider.js';
import './HabitatCircle.js';
import './HabitatPath.js';
import './HabitatStakes.js';
import './HabitatDelegationView.js';
import { ethers } from '/lib/extern/ethers.esm.min.js';

const { HBT } = getConfig();
let walletContainer;
let tokenContract;
let account;

const NAV_TEMPLATE =
`
<div class='wrapperNav'>
  <div class='flex row center around' style='padding-right:3rem;'>
    <div class='flex col left' style='align-items:flex-start;'>
      <div class='flex col'>
        <object type='image/svg+xml' style='height:2rem;' data='/lib/assets/v2-logo-full.svg'></object>
        <a href='/' style=position:relative;top:-2em;height:2em;width:100%;margin-bottom:-2em;></a>
      </div>
      <button id='add747' style='margin:.3rem 0;font-size:.6em;' class='secondary purple noHover'>Add HBT to MetaMask</button>
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
