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
  onChainUpdate
} from './rollup.js';

import './HabitatColorToggle.js';
import './HabitatTokenAmount.js';

const { HBT } = getConfig();

const NAV_TEMPLATE =
`
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
  padding-left: 1em;
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
  padding-bottom: 0.7em;
}

.settings > span {
  align-self: center;
}

.color-toggle {
  transform: none;
}

</style>
<div class='sidebar'>
  <div id='top'>
    <div class='flex col center around'>
      <div class='flex col'>
        <object type='image/svg+xml' style='height:2em;' data='/lib/assets/v2-logo-full.svg'></object>
      </div>
      <space></space>
      <div id='walletbox' class='flex col'>
        <div class='dropdown'>
          <a href='' id='connect' class='noHover' style='border:none;font-size:1.2em;'>Connect</a>
        </div>
        <space></space>
        <p id='status' class='smaller'></p>
      </div>
    </div>
    <space></space>
    <div class='flex col evenly'>
      <div class='no-max-width' style='display:grid;'>
        <a class='button' href='#habitat-communities'>Communities</a>
        <a class='button' target='_blank' href='/evolution/'>Evolution</a>
        <a class='button' target='_blank' href='/explorer/'>Block Explorer</a>
      </div>
      <space></space>
    </div>
  </div>

  <div id='balances' class='flex col evenly' style='padding:.5em;'>
    <space></space>
    <div class='no-max-width' style='display:grid;width:calc(100% - 1em);'>
      <div>
        <div class='balance-title'>
          <span class='icon-eth'>Mainnet</span>
          <span><a href='' id="withdraw" class="action-link">Withdraw</a></span>
        </div>
        <space></space>
        <p class='bl flex center'><habitat-token-amount id='mainnetBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
      <space></space>
      <space></space>
      <div>
        <div class='balance-title'>
          <span>🏕 Rollup</span>
          <span><a href='' id="deposit" class="action-link">Deposit</a></span>
        </div>
        <space></space>
        <p class='bl flex center'><habitat-token-amount id='rollupBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
      <space></space>
      <space></space>
      <div class='left'>
        <div class='balance-title'>
          <span>⛽️ Gas</span>
          <span><a href='' id='topup' class="action-link">Top up</a></span>
        </div>
        <space></space>
        <p class='bl flex center'><habitat-token-amount id='gasTankBalance' class='flex' token='${HBT}'></habitat-token-amount></p>
      </div>
    </div>
    <space></space>
    <div class='settings'>
      <span><a href='#habitat-account'> ⚙ User Settings</a></span>
      <span><habitat-color-toggle class='color-toggle'></habitat-color-toggle></span>
    </div>
  </div>
</div>`;

class HabitatSidebar extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback () {
    this.innerHTML = NAV_TEMPLATE;
    this._walletContainer = this.querySelector('#walletbox');

    wrapListener(this.querySelector('a#connect').parentElement, async () => {
      await getSigner();
      this.update();
      window.location.hash = '#habitat-account';
    });

    const onNavigate = () => {
      const ele = this.querySelector('.target');
      if (ele) {
        ele.classList.remove('target');
      }
      const target = this.querySelector(`a[href="${window.location.hash.split(',')[0]}"`);
      if (target) {
        target.classList.add('target');
      }
    }
    window.addEventListener('hashchange', onNavigate, false);
    onNavigate();
    this.wrapActions();
    this.update();
  }

  wrapActions() {
    wrapListener(this.querySelector('a#topup'), () => {
      this.updateDOM('Top Up Gas Tank');
    });
    wrapListener(this.querySelector('a#deposit'), () => {
      this.updateDOM('Deposit');
    });
    wrapListener(this.querySelector('a#withdraw'), () => {
      this.updateDOM('Withdraw');
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

    walletStatus.textContent = '🙌 Connected';

    center.textContent = await getUsername(account);
    this._walletContainer.classList.add('connected');

    const token = await getTokenV2(HBT);
    const { habitat } = await getProviders();
    {
      const value = await token.contract.balanceOf(account);
      const e = this.querySelector('#mainnetBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }
    {
      const value = await habitat.callStatic.getBalance(token.address, account);
      const e = this.querySelector('#rollupBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }
    {
      const { value } = await getGasTank(account);
      const e = this.querySelector('#gasTankBalance');
      e.setAttribute('owner', account);
      e.setAttribute('amount', value);
    }
  }
}
customElements.define('habitat-sidebar', HabitatSidebar);
