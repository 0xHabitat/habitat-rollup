import {
  sendTransaction,
  getProviders,
  encodeExternalProposalActions,
  encodeInternalProposalActions,
  fetchVaultInformation,
  fetchIssue,
} from '/lib/rollup.js';
import {
  getErc20,
  wrapListener,
  getSigner,
  getTokenName,
  renderAmount,
  ethers,
} from '/lib/utils.js';
import {
  AddExecutionFlow,
  AddTransferFlow,
} from '/lib/flows.js';

let vaultAddress, communityId;
const externalActions = [];
const internalActions = [];

async function addAction (obj) {
  const grid = document.querySelector('#proposalActions');
  let args = [];

  if (obj.contractAddress) {
    // on-chain execution
    args = [
      'On-chain Execution',
      obj.contractAddress,
      obj.calldata,
    ];
    externalActions.push(obj.contractAddress);
    externalActions.push(obj.calldata);
  }

  if (obj.erc20) {
    args = [
      'Token Transfer',
      obj.receiver,
      `${obj.amount} ${obj.erc20._symbol}`,
    ];
    internalActions.push('0x1');
    internalActions.push(obj.erc20.address);
    internalActions.push(obj.receiver);
    internalActions.push(ethers.utils.parseUnits(obj.amount, obj.erc20._decimals).toHexString());
  }

  for (const arg of args) {
    const p = document.createElement('p');
    p.textContent = arg;
    grid.appendChild(p);
  }
}

async function doSubmit (evt) {
  const { habitat, rootProvider } = await getProviders();
  const container = document.querySelector('#propose');
  const actions = document.querySelector('.actions');
  const inputs = document.querySelectorAll('button input textarea');
  const src = document.querySelector('input#url').value;
  let title = '';
  let details = '';

  {
    const titleSrc = container.querySelector('input#title');
    if (titleSrc) {
      title = titleSrc.value;
    }
    const textarea = container.querySelector('textarea');
    if (textarea) {
      details = textarea.value;
    }
  }
  // github
  {
    const titleSrc = container.querySelector('h1#title');
    if (titleSrc) {
      title = titleSrc.textContent;
    }
  }

  for (const ele of inputs) {
    ele.disabled = true;
  }

  try {
    const args = {
      // xxx query contract
      startDate: ~~(Date.now() / 1000),
      vault: vaultAddress,
      externalActions: encodeExternalProposalActions(externalActions),
      internalActions: encodeInternalProposalActions(internalActions),
      metadata: JSON.stringify({ title, details, src }),
    };
    const receipt = await sendTransaction('CreateProposal', args);
    window.location.href = `../proposal/#${receipt.transactionHash}`;
  } finally {
    for (const ele of inputs) {
      ele.disabled = false;
    }
  }
}

async function renderIssue (evt) {
  const url = evt.target.value;
  const issue = await fetchIssue(url);

  document.querySelector('#title').textContent = issue.title;
  // xxx: consider using an iframe for embedding
  document.querySelector('#body').innerHTML = issue.body_html;
}

async function render () {
  [vaultAddress, communityId] = window.location.hash.replace('#', '').split(',');

  wrapListener('input#url', renderIssue, 'change');
  wrapListener('button#submit', doSubmit);
  wrapListener('button#execution', (evt) => new AddExecutionFlow(evt.target, { callback: addAction }));
  wrapListener('button#transfer', (evt) => new AddTransferFlow(evt.target, { callback: addAction }));

  const vaultInfo = await fetchVaultInformation(vaultAddress);
  if (vaultInfo) {
    document.querySelector('#vaultName').textContent = `For Treasury: ${vaultInfo.name}`;
  }
}

window.addEventListener('DOMContentLoaded', render, false);
