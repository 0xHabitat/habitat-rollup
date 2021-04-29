import {
  sendTransaction,
  deployModule,
} from '/lib/rollup.js';
import {
  wrapListener,
} from '/lib/utils.js';

async function doSubmit (evt) {
  const container = document.querySelector('#propose');
  const name = container.querySelector('input#title');
  const textarea = container.querySelector('textarea');
  const inputs = document.querySelectorAll('button input textarea');
  const file = document.querySelector('input#json').files[0];

  if (!file) {
    throw new Error(`Please provide a file`);
  }

  for (const ele of inputs) {
    ele.disabled = true;
  }

  try {
    const artefact = JSON.parse(await file.text());
    const contract = await deployModule(artefact.deployedBytecode);
    const args = {
      contractAddress: contract.address,
      metadata: JSON.stringify({ name: name.value, details: textarea.value }),
    };
    const receipt = await sendTransaction('SubmitModule', args);
  } finally {
    for (const ele of inputs) {
      ele.disabled = false;
    }
  }
}

async function render () {
  wrapListener('button#submit', doSubmit);
}

window.addEventListener('DOMContentLoaded', render, false);
