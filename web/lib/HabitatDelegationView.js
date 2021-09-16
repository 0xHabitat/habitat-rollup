import {
  walletIsConnected,
  getSigner,
  setupTokenlistV2,
  ethers,
  getTokenV2,
  wrapListener,
  renderAddress,
} from './utils.js';
import {
  getProviders,
  doQuery,
  resolveName,
  sendTransaction,
  doQueryWithOptions,
  getBlockExplorerLink,
  getUsername,
  onChainUpdate
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import './HabitatTokenAmount.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
#grid {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 8px;
  width: 100%;
  place-content: center space-evenly;
}
</style>
<template id='col'>
<a target='_blank'></a>
<habitat-token-amount></habitat-token-amount>
<button class='smaller secondary purple'>Change Allowance</button>
<button class='smaller secondary purple'>Remove</button>
</template>

<div class='flex col'>
  <div class='flex col align-left'>
    <p>Delegate a specific amount to another person.</p>
    <p class='smaller bold'>The amount can be changed any time.</p>
  </div>
  <space></space>
  <label>
    Token
    <input id='token' list='tokenlistv2' autocomplete='off'>
  </label>
  <label>
    Amount
    <input id='amount' type='number' value='1'>
  </label>
  <label>
    To
    <input id='delegatee' autocomplete='off'>
  </label>
  <button id='delegatee'>Change</button>
</div>

<space></space>
<sep></sep>
<space></space>
<div>
  <space></space>
  <div id='grid' class='align-right'></div>
  <space></space>
</div>`;

// TODO: automatically free any locked stakes
async function removeDelegation ({ token, value, delegatee }) {
  const args = {
    token,
    value: '0x0',
    delegatee,
  };
  await sendTransaction('DelegateAmount', args);
}

export default class HabitatDelegationView extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._container = this.shadowRoot.querySelector('#grid');

    wrapListener(
      this.shadowRoot.querySelector('button#delegatee'),
      this.changeAmount.bind(this)
    );
  }

  connectedCallback () {
    this.update();
    // async
    setupTokenlistV2(this.shadowRoot);
  }

  async changeAmount () {
    const delegatee = await resolveName(this.shadowRoot.querySelector('input#delegatee').value);
    if (!delegatee) {
      throw new Error('user not found');
    }
    const token = await getTokenV2(this.shadowRoot.querySelector('input#token').value);
    const value = ethers.utils.parseUnits(this.shadowRoot.querySelector('input#amount').value, token.decimals).toHexString();
    const args = {
      token: token.address,
      value,
      delegatee,
    };
    await sendTransaction('DelegateAmount', args);
  }

  async populateChange ({ token, value, delegatee }) {
    const erc = await getTokenV2(token);
    this.shadowRoot.querySelector('input#token').value = token;
    this.shadowRoot.querySelector('input#amount').value = ethers.utils.formatUnits(value, erc.decimals);
    this.shadowRoot.querySelector('input#delegatee').value = delegatee;
    this.shadowRoot.querySelector('button#delegatee').focus();
  }

  async update () {
    if (!this.isConnected) {
      return;
    }
    onChainUpdate(this.update.bind(this));

    if (!walletIsConnected) {
      return;
    }

    const signer = await getSigner();
    const account = await signer.getAddress();
    const { habitat } = await getProviders();
    const template = this.shadowRoot.querySelector('template#col');
    const tmp = {};

    for (const log of await doQueryWithOptions({ toBlock: 1 }, 'DelegatedAmount', account)) {
      const { delegatee, token, value } = log.args;
      const k = 'x' + delegatee + token;
      if (tmp[k]) {
        continue;
      }
      tmp[k] = true;

      if (value.eq(0)) {
        continue;
      }

      const updateOnly = this.shadowRoot.querySelector('#' + k);
      if (updateOnly) {
        updateOnly.setAttribute('amount', value.toString());
        continue
      }

      const ele = this.shadowRoot.querySelector('#' + k) || template.content.cloneNode(true);
      ele.children[0].textContent = await getUsername(delegatee);
      ele.children[0].href = getBlockExplorerLink(log.transactionHash);

      ele.children[1].id = k;
      ele.children[1].setAttribute('token', token);
      ele.children[1].setAttribute('amount', value.toString());

      // button
      wrapListener(
        ele.children[2],
        async () => {
          await this.populateChange({ token, value, delegatee });
        }
      );

      wrapListener(
        ele.children[3],
        async () => {
          await removeDelegation({ token, value, delegatee });
        }
      );

      this._container.appendChild(ele);
    }
  }
}

customElements.define('habitat-delegation-view', HabitatDelegationView);
