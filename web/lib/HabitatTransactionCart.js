import { wrapListener, getTokenV2, renderAmount } from './utils.js';
import { signBatch } from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import BalanceTracker from './BalanceTracker.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: flex;
}

#outer {
  padding: .25em;
  cursor: pointer;
  overflow: hidden;
}

#txGrid {
  display: grid;
  max-height: 6em;
  overflow: scroll;
  overflow: overlay;
  -webkit-overflow-scrolling: touch;
  gap: .1rem;
  grid-template-columns: 1fr;
}

#txGrid > * {
  font-weight: lighter;
}

#txBundle {
  display: flex;
  opacity: 0;
  max-width: 0;
  max-height: 0;
  transition: opacity .2s ease-out;
}

#outer.expanded #txBundle {
  opacity: 1;
  max-width: max-content;
  max-height: max-content;
  padding: 1em;
  position: absolute;
  right: 1em;
  top: 3em;
  border-radius: 0 0 1em 1em;
  border: 1px solid var(--color-bg-invert);
  background: var(--color-bg);
}

#count {
  color: #F28F74;
}

#close {
  place-self: flex-end;
}

#bal {
  text-decoration: underline;
}
</style>
<div id='outer' class='flex row'>
  <span id='bal' class='s'></span>
  <div id='txBundle' class='flex col s'>
    <span>
      <span id='count' class='bold l'></span>
      <span>Pending Transactions</span>
    </span>
    <div id='txGrid'></div>
    <button id='txSign' class='m'>Sign</button>
    <a id='close'>&#10006;</a>
  </div>
</div>
`;

class HabitatTransactionCart extends HTMLElement {
  constructor() {
    super();

    this._closedManually = false;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    const wrapper = this.shadowRoot.querySelector('#outer');
    const self = this;
    function toggle () {
      self._closedManually = true;
      wrapper.classList.toggle('expanded');
    }
    wrapListener(wrapper, toggle);
    wrapListener(this.shadowRoot.querySelector('#close'), toggle);

    wrapListener(this.shadowRoot.querySelector('#txSign'), async () => {
      await signBatch(this._txBundle);
      wrapper.classList.toggle('expanded');
    });
  }

  connectedCallback () {
    window.addEventListener('message', this);
  }

  disconnectedCallback () {
    window.removeEventListener('message', this);
  }

  async handleEvent (evt) {
    if (!evt.data) {
      return;
    }

    if (evt.data.type === 'hbt-tx-bundle') {
      this._txBundle = evt.data.value;

      const container = this.shadowRoot.querySelector('#txBundle');
      const grid = this.shadowRoot.querySelector('#txGrid');
      grid.innerHTML = '';
      this.shadowRoot.querySelector('#count').textContent = `${evt.data.value.length}`;

      for (const tx of evt.data.value) {
        const e = document.createElement('p');
        e.textContent = `${tx.info}`;
        grid.append(e);
      }

      if (!this._closedManually) {
        const wrapper = this.shadowRoot.querySelector('#outer');
        if (evt.data.value.length) {
          wrapper.classList.add('expanded');
        } else {
          wrapper.classList.remove('expanded');
        }
      }

      return;
    }

    if (evt.data.type === 'hbt-balance-tracker-update') {
      const obj = evt.data.value;
      const token = await getTokenV2(obj.tokenAddress);
      const { available } = await BalanceTracker.stat(token, obj.delegationMode);
      this.shadowRoot.querySelector('#bal').textContent = `${renderAmount(~~available, 0, 1)} ${token.symbol} remaining`;
      return;
    }
  }
}
customElements.define('habitat-transaction-cart', HabitatTransactionCart);
