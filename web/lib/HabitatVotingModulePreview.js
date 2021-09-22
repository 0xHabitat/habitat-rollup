import {
  renderAddress,
  getEtherscanLink,
} from './utils.js';
import {
  getMetadataForTopic,
  doQueryWithOptions,
  fetchModuleInformation,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

async function fetchInfo (vaultAddress) {
  const logs = await doQueryWithOptions({ toBlock: 1, maxResults: 1 }, 'VaultCreated', null, null, vaultAddress);
  const evt = logs[logs.length - 1];
  const metadata = await fetchModuleInformation(evt.args.condition);

  metadata.flavor = metadata.flavor || 'binary';

  return { evt, metadata };
}

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.expand {
  place-content: flex-end;
  position: relative;
  top: 1em;
  height: 0;
  cursor: pointer;
}
.expandable {
  max-height: 0;
  transition: max-height .2s ease-out;
  overflow: hidden;
}
.expanded {
  max-height: 100em;
  -webkit-overflow-scrolling: touch;
  overflow-y: scroll;
  overflow-y: overlay;
  transition: max-height .3s ease-in;
}
.lbl {
  color: var(--color-grey);
  font-weight: ligther;
}
a#expand {
  text-decoration: underline;
}
</style>
<div class='box left' style='padding:.5em 2em;height:100%;'>
  <p id='name'> </p>
  <a id='viewContract' target='_blank' class='s'>View Contract</a>
  <space></space>
  <a href='' id='expand' class='lbl s'>MORE INFO</a>
  <div class='expandable'>
    <p id='details' class='s' style='max-width:40ch;'> </p>
  </div>
</div>
`;

const ATTR_VAULT = 'vault';
const ATTR_CONDITION = 'condition';

export default class HabitatVotingModulePreview extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_VAULT, ATTR_CONDITION];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
    this.shadowRoot.querySelector('a#expand').addEventListener('click', (evt) => {
      evt.preventDefault();
      this.toggleExpand();
    }, false);
  }

  connectedCallback () {
    this.render();
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    this.render();
  }

  toggleExpand () {
    const LESS = 'LESS INFO';
    const MORE = 'MORE INFO';
    const e = this.shadowRoot.querySelector('#expand');
    e.textContent = e.textContent === LESS ? MORE : LESS;
    for (const node of this.shadowRoot.querySelectorAll('.expandable')) {
      node.classList.toggle('expanded');
    }
  }

  async render () {
    if (!this.isConnected) {
      return;
    }

    let metadata;
    let condition = this.getAttribute(ATTR_CONDITION);
    if (!condition) {
      const vaultAddress = this.getAttribute(ATTR_VAULT);
      if (!vaultAddress) {
        return;
      }

      const res = await fetchInfo(vaultAddress);
      metadata = res.metadata;
      condition = res.evt.args.condition;
    } else {
      metadata = await fetchModuleInformation(condition);
    }

    this.shadowRoot.querySelector('#name').textContent = (metadata ? metadata.name : '') || '???';
    this.shadowRoot.querySelector('#viewContract').href = getEtherscanLink(condition);
    this.shadowRoot.querySelector('#details').textContent = metadata.details || '<none>';
  }
}
customElements.define('habitat-voting-module-preview', HabitatVotingModulePreview);
