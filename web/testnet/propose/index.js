import { sendTransaction, getProviders, encodeProposalActions } from '/lib/rollup.js';
import {
  getErc20,
  wrapListener,
  getSigner,
  ethers,
} from '/lib/utils.js';

let vaultAddress, communityId;

function getAndReset (selector) {
  const ele = document.querySelector(selector);
  const val = ele.value;

  ele.value = '';
  return val;
}

async function addAction () {
  const grid = document.querySelector('#proposalActions');
  const args = [
    ethers.utils.getAddress(getAndReset('#addr')),
    ethers.utils.hexlify(getAndReset('#calldata').toLowerCase()),
  ];

  for (const arg of args) {
    const p = document.createElement('p');
    p.textContent = arg;
    grid.appendChild(p);
  }
}

async function doSubmit (evt) {
  const { habitat, rootProvider } = await getProviders();
  const container = document.querySelector('#propose');
  const input = container.querySelector('input');
  const textarea = container.querySelector('textarea');
  const actions = document.querySelector('.actions');
  const btn = document.querySelector('button#submit');

  btn.disabled = true;
  input.disabled = true;
  textarea.disabled = true;

  {
    /*
    const tokenAddress = await habitat.tokenOfCommunity(communityId);
    const token = await getErc20(tokenAddress);
    const decimals = await token.decimals();
    const signer = await getSigner();
    const { shares } = await habitat.members(await signer.getAddress());
    if (shares.lt(ethers.utils.parseUnits(MIN_PROPOSAL_CREATION_STAKE.toString(), decimals))) {
      throw new Error(`You need at least ${MIN_PROPOSAL_CREATION_STAKE} shares to create Proposals`);
    }
    */
  }

  const childs = document.querySelector('#proposalActions').children;
  const proposalActions = [];

  // skip the first 2 elements (descriptors)
  for (let i = 2, len = childs.length; i < len;) {
    // to
    proposalActions.push(childs[i++].textContent);
    // calldata
    proposalActions.push(childs[i++].textContent);
  }

  const args = {
    // xxx query contract
    startDate: ~~(Date.now() / 1000),
    vault: vaultAddress,
    title: input.value,
    actions: encodeProposalActions(proposalActions),
    metadata: JSON.stringify({ details: textarea.value }),
  };
  const receipt = await sendTransaction('CreateProposal', args);
  window.location.href = `../proposal/#${receipt.transactionHash}`;

  btn.disabled = false;
  input.disabled = false;
  textarea.disabled = false;
}

async function render () {
  [vaultAddress, communityId] = window.location.hash.replace('#', '').split(',');

  wrapListener('button#submit', doSubmit);
  wrapListener('button#addAction', addAction);
}

window.addEventListener('DOMContentLoaded', render, false);
