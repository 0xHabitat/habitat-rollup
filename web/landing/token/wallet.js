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
  right.textContent = network.name;
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
