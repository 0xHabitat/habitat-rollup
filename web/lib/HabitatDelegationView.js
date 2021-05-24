import {
  walletIsConnected,
  getSigner,
  setupTokenlist,
  ethers,
  getToken,
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
} from './rollup.js';

import './HabitatTokenAmount.js';

const TEMPLATE =
`
<template id='col'>
<a target='_blank'></a>
<habitat-token-amount></habitat-token-amount>
<button class='smaller secondary purple'>Change Allowance</button>
</template>

<div class='flex col'>
  <h3>Delegate</h3>
  <space></space>
  <label>
    Token
    <input id='token' list='tokenlist' autocomplete='off'>
  </label>
  <label>
    How much
    <input id='amount' type='number' value='1'>
  </label>
  <label>
    Delegatee
    <input id='delegatee' autocomplete='off'>
  </label>
  <button id='delegatee'>Change</button>
</div>

<div>
  <space></space>
  <div class='auto-col-grid align-right' style='grid-template-columns:repeat(3,auto);'></div>
  <space></space>
</div>`;

export default class HabitatDelegationView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
      this._container = this.querySelector('.auto-col-grid');

      wrapListener(
        this.querySelector('button#delegatee'),
        this.changeAmount.bind(this)
      );

      //setInterval(this.update.bind(this), 3000);
      this.update();
      // async
      setupTokenlist();
    }
  }

  async changeAmount () {
    const delegatee = await resolveName(this.querySelector('input#delegatee').value);
    if (!delegatee) {
      throw new Error('user not found');
    }
    const token = await getToken(this.querySelector('input#token').value);
    const value = ethers.utils.parseUnits(this.querySelector('input#amount').value, token._decimals).toHexString();
    const args = {
      token: token.address,
      value,
      delegatee,
    };
    await sendTransaction('DelegateAmount', args);
    await this.update();
  }

  async populateChange ({ token, value, delegatee }) {
    const erc = await getToken(token);
    this.querySelector('input#token').value = token;
    this.querySelector('input#amount').value = ethers.utils.formatUnits(value, erc._decimals);
    this.querySelector('input#delegatee').value = delegatee;
    this.querySelector('button#delegatee').focus();
  }

  async update () {
    if (!walletIsConnected) {
      return;
    }

    const signer = await getSigner();
    const account = await signer.getAddress();
    const { habitat } = await getProviders();
    const tmp = {};
    const template = this.querySelector('template#col');

    for (const log of await doQueryWithOptions({ toBlock: 1 }, 'DelegatedAmount', account)) {
      const { delegatee, token, value } = habitat.interface.parseLog(log).args;
      const k = 'x' + delegatee + token;
      if (tmp[k]) {
        continue;
      }
      tmp[k] = true;

      const updateOnly = this.querySelector('#' + k);
      if (updateOnly) {
        updateOnly.setAttribute('amount', value.toString());
        continue
      }

      const ele = this.querySelector('#' + k) || template.content.cloneNode(true);
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

      this._container.appendChild(ele);
    }
  }
}

customElements.define('habitat-delegation-view', HabitatDelegationView);
