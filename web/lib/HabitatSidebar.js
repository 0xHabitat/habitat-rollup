import { COMMON_STYLESHEET } from './component.js';
import {
  getSigner,
  wrapListener,
  renderAmount,
  walletIsConnected,
  getConfig,
  getTokenV2,
  ethers
} from './utils.js';
import {
  getUsername,
  getProviders,
  getGasTank,
  onChainUpdate,
  signBatch,
  scavengeProposals,
} from './rollup.js';

import './HabitatColorToggle.js';
import './HabitatTokenAmount.js';

const { HBT } = getConfig();

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.sidebar {
  display: flex;
  max-width: max-content;
  flex-direction: column;
  place-items: center;
  border-radius: 2em 0 2em 0;
  box-shadow: 4px 4px 20px rgba(0,0,0,.4);
  padding-bottom: 2em;
  overflow: hidden;
  padding: 0;
  margin: 2em auto;
  background-color: none;
}
.sidebar button,
.sidebar .button {
  width: 100%;
}
#top {
  background-color: var(--color-bg);
  border-radius: 0 0 2em 0;
  padding: 1em;
}
#balances {
  width: 100%;
  padding: .5rem .7rem;
}
.bl {
  text-align: center;
  font-size: .7em;
  border: 1px solid;
  border-radius: 1em;
  padding: .5em;
  background-color: var(--color-bg);
}
.bl a {
  color: var(--color-text);
}
.sidebar .button.target {
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
}

.balance-title {
  padding: .4rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.action-link {
  font-size: 0.65em;
  text-decoration: underline;
}

.settings {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  font-size: 0.7em;
}

.settings span {
  align-self: center;
}

.color-toggle {
  transform: none;
}

#txBundle {
  display: none;
}

#txGrid {
  display: grid;
  gap: .1rem;
  grid-template-columns: 1fr;
}

#txGrid > * {
  font-weight: lighter;
}
#scavengeProposals {
  display: none;
  margin: .5em 0;
}
#connect {
  margin: .3rem auto 0 auto;
  padding: .3rem;
  font-size: 1.2em;
}
</style>
<div class='sidebar'>
  <div id='top'>
    <div class='flex col center around'>
      <div class='flex col'>
        <a href='/app' class='mask-contain mask-logo' style='display:block;width:10em;height:2em;background-color:var(--color-bg-invert);'></a>
      </div>
      <div id='walletbox' class='flex col'>
        <a href='' id='connect' class='button black center'>Connect</a>
        <p id='status' class='smaller'></p>
      </div>
    </div>
    <space></space>

    <div id='txBundle' class='flex col s'>
      <p class='m'>🚩 Pending Transactions:</p>
      <div id='txGrid'></div>
      <button id='txSign' class='m black'>Sign</button>
    </div>

    <div class='flex col'>
      <button id='scavengeProposals' class='s'>
        <span>Scavenge Votes </span>
        <span>(</span>
        <span id='count'></span>
        <span>)</span>
      </button>
    </div>

    <div class='flex col evenly'>
      <div class='no-max-width' style='display:grid;'>
        <a class='button' href='#habitat-communities'>Communities</a>
        <a class='button' href='#habitat-evolution'>Evolution</a>
        <a class='button' target='_blank' href='/explorer/'>Block Explorer</a>
        <a class='button' href='#habitat-tools'>Tools</a>
      </div>
      <space></space>
    </div>
  </div>

  <div id='balances' class='flex col evenly'>
    <div class='no-max-width' style='display:grid;width:calc(100% - 1em);'>
      <div>
        <div class='balance-title'>
          <span class='icon-eth'>Mainnet</span>
          <span><a href='' id="withdraw" class="action-link">Withdraw</a></span>
        </div>
        <p class='bl flex center'><habitat-token-amount id='mainnetBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
      <space></space>
      <div>
        <div class='balance-title'>
          <span><emoji-camping></emoji-camping><span> Rollup</span></span>
          <span><a href='' id="deposit" class="action-link">Deposit</a></span>
        </div>
        <p class='bl flex center'><habitat-token-amount id='rollupBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
      <space></space>
      <div class='left'>
        <div class='balance-title'>
          <span><emoji-fuel-pump></emoji-fuel-pump><span> Gas</span></span>
          <span><a href='' id='topup' class="action-link">Top up</a></span>
        </div>
        <p class='bl flex center'><habitat-token-amount id='gasTankBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
    </div>
    <space></space>
    <div class='settings'>
      <span><a href='#habitat-account'><span style='line-height:.8;font-size:1.5em;'>⚙</span><span> User Settings</span></a></span>
      <span><habitat-color-toggle class='color-toggle'></habitat-color-toggle></span>
    </div>
  </div>
</div>`;

class HabitatSidebar extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._walletContainer = this.shadowRoot.querySelector('#walletbox');

    wrapListener(this.shadowRoot.querySelector('#connect'), async () => {
      await getSigner();
      this.update();
      window.location.hash = '#habitat-account';
    });
    wrapListener(this.shadowRoot.querySelector('#txSign'), async () => {
      await signBatch(this._txBundle);

      const container = this.shadowRoot.querySelector('#txBundle');
      container.style.display = 'none';
    });

    const onNavigate = () => {
      const ele = this.shadowRoot.querySelector('.target');
      if (ele) {
        ele.classList.remove('target');
      }
      const target = this.shadowRoot.querySelector(`a[href="${window.location.hash}"`);
      if (target) {
        target.classList.add('target');
      }
    }
    window.addEventListener('hashchange', onNavigate, false);
    window.addEventListener('message', this);

    onNavigate();
    this.wrapActions();
    this.update();
  }

  disconnectedCallback () {
    window.removeEventListener('message', this);
  }

  handleEvent (evt) {
    if (evt.data && evt.data.type === 'hbt-tx-bundle') {
      this._txBundle = evt.data.value;

      const container = this.shadowRoot.querySelector('#txBundle');
      container.style.display = evt.data.value.length ? 'flex' : 'none';

      const grid = this.shadowRoot.querySelector('#txGrid');
      grid.innerHTML = '';

      for (const tx of evt.data.value) {
        const e = document.createElement('p');
        e.textContent = `${tx.info}`;
        grid.append(e);
      }
      return;
    }
  }

  wrapActions() {
    wrapListener(this.shadowRoot.querySelector('a#topup'), () => {
      this.updateDOM('Top Up Gas Tank');
    });
    wrapListener(this.shadowRoot.querySelector('a#deposit'), () => {
      this.updateDOM('Deposit');
    });
    wrapListener(this.shadowRoot.querySelector('a#withdraw'), () => {
      this.updateDOM('Withdraw');
    });
    wrapListener(this.shadowRoot.querySelector('#scavengeProposals'), async () => {
      const txs = await scavengeProposals();
      window.postMessage({ type: 'hbt-tx-bundle', value: txs }, window.location.origin);
    });
  }

  updateDOM(action) {
    window.location.hash = '#habitat-account';
    window.postMessage({
      type: 'hbt-transfer-box-action', value: action
    }, window.location.origin);
  }

  async update () {
    onChainUpdate(this.update.bind(this));

    if (!this.isConnected) {
      return;
    }

    if (!walletIsConnected()) {
      return;
    }

    const signer = await getSigner();
    const account = await signer.getAddress();
    const center = this._walletContainer.querySelector('#connect');
    const walletStatus = this._walletContainer.querySelector('#status');

    walletStatus.innerHTML = '<emoji-raising-hands></emoji-raising-hands><span> Connected</span>';

    center.textContent = await getUsername(account);
    center.classList.remove('button', 'black');
    this._walletContainer.classList.add('connected');

    const token = await getTokenV2(HBT);
    const { habitat } = await getProviders();
    {
      const value = await token.contract.balanceOf(account);
      const e = this.shadowRoot.querySelector('#mainnetBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }
    {
      const value = await habitat.callStatic.getBalance(token.address, account);
      const e = this.shadowRoot.querySelector('#rollupBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }
    {
      const { value } = await getGasTank(account);
      const e = this.shadowRoot.querySelector('#gasTankBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }

    // misc
    {
      const txs = await scavengeProposals();
      const e = this.shadowRoot.querySelector('#scavengeProposals');
      if (txs.length) {
        e.style.display = 'flex';
        e.querySelector('#count').textContent = txs.length;
      } else {
        e.style.display = 'none';
      }
    }
  }
}
customElements.define('habitat-sidebar', HabitatSidebar);
