import { wrapListener } from './utils.js';
import { signBatch } from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
#outer {
  height: 1.5em;
  width: 1.5em;
  padding: .25em;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  background-color: var(--color-bg);
  border: 1px solid var(--color-bg-invert);
  position: absolute;
  right: 0;
}

#outer.expanded {
  height: auto;
  width: auto;
  min-height: 4em;
  padding: .5em 1em;
  border-radius: 1em;
}

#txGrid {
  display: grid;
  gap: .1rem;
  grid-template-columns: 1fr;
}

#txGrid > * {
  font-weight: lighter;
}

#txBundle {
  display: none;
}

#outer.expanded #txBundle {
  display: flex;
}

#count {
  position: relative;
  top: -.2em;
  left: .1em;
  width: 1.5em;
  height: 1.5em;
  text-align: left;
  font-weight: bold;
  color: orange;
}

#close {
  place-self: flex-end;
}
</style>
<div id='outer' class='flex row'>
  <p id='count'>0</p>
  <div id='txBundle' class='flex col s'>
    <p class='bold m'><span>Pending Transactions</span></p>
    <space></space>
    <div id='txGrid'></div>
    <button id='txSign' class='m'>Sign</button>
    <a id='close'>&#10006;</a>
  </div>
</div>
`;

class HabitatTransactionCart extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    const wrapper = this.shadowRoot.querySelector('#outer');
    function toggle () {
      wrapper.classList.toggle('expanded');
    }
    wrapListener(wrapper, toggle);
    wrapListener(this.shadowRoot.querySelector('#close'), toggle);

    wrapListener(this.shadowRoot.querySelector('#txSign'), async () => {
      await signBatch(this._txBundle);
    });
  }

  connectedCallback () {
    window.addEventListener('message', this);
  }

  disconnectedCallback () {
    window.removeEventListener('message', this);
  }

  handleEvent (evt) {
    if (evt.data && evt.data.type === 'hbt-tx-bundle') {
      this._txBundle = evt.data.value;

      const container = this.shadowRoot.querySelector('#txBundle');
      const grid = this.shadowRoot.querySelector('#txGrid');
      grid.innerHTML = '';
      this.shadowRoot.querySelector('#count').textContent = evt.data.value.length;

      for (const tx of evt.data.value) {
        const e = document.createElement('p');
        e.textContent = `${tx.info}`;
        grid.append(e);
      }
      return;
    }
  }
}
customElements.define('habitat-transaction-cart', HabitatTransactionCart);
