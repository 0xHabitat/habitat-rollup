import { formatObject, wrapListener } from '../common/utils.js';
import { sendTransaction, getProviders, encodeProposalActions } from '../common/tx.js';

function getAndReset (selector) {
  const ele = document.querySelector(selector);
  const val = ele.value;

  ele.value = '';
  return val;
}

async function addAction () {
  const grid = document.querySelector('.proposalActions');
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

async function submitProposal (startingPeriod, title, details, proposalActions) {
  const args = {
    startingPeriod,
    title,
    details,
    actions: encodeProposalActions(proposalActions),
  };

  const receipt = await sendTransaction('SubmitProposal', args);
  window.location.href = `/proposal/#${receipt.transactionHash}`;
}

async function render () {
  const { habitat } = await getProviders();

  const container = document.querySelector('.proposal');
  const input = container.querySelector('input');
  const textArea = container.querySelector('textarea');
  const actions = document.querySelector('.actions');
  const btn = document.querySelector('button#submit');

  btn.addEventListener(
    'click',
    async () => {
      btn.disabled = true;
      input.disabled = true;
      textArea.disabled = true;

      try {
        const childs = document.querySelector('.proposalActions').children;
        const proposalActions = [];

        // skip the first 2 elements (descriptors)
        for (let i = 2, len = childs.length; i < len;) {
          // to
          proposalActions.push(childs[i++].textContent);
          // calldata
          proposalActions.push(childs[i++].textContent);
        }

        await submitProposal(
          (await habitat.getCurrentPeriod()).toHexString(),
          // title
          input.value,
          // proposal body
          textArea.value,
          // proposal actions
          proposalActions
        );
      } catch (e) {
        console.error(e);
        window.alert((e.message || e).toString());
      }

      btn.disabled = false;
      input.disabled = false;
      textArea.disabled = false;
    },
    false
  );

  wrapListener('button#addAction', addAction);
}

window.addEventListener('DOMContentLoaded', render, false);
