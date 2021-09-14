import { wrapListener } from './utils.js';
import { COMMON_STYLESHEET } from './component.js';

import HabitatPanel from './HabitatPanel.js';
import './HabitatVERCCreator.js';
import './HabitatVERCList.js';
import './HabitatRegisterModule.js';
import './HabitatLpList.js';

export default class HabitatTools extends HabitatPanel {
  static TEMPLATE = `
  <div class='flex col align-left' style='padding:1rem;'>
    <space></space>
    <h3>Habitat Tool Gallery</h3>
    <space></space>
    <div class='flex row center evenly' style='gap:1rem;align-items:start;'>
      <habitat-preview-tool
          title='V(irtual) ERC-20 Minting'
          details='Mint your own tokens and start your DAO'
          component='habitat-verc-creator'
          ></habitat-preview-tool>
      <habitat-preview-tool
          title='V(irtual) ERC-20 Overview'
          details='Explore all tokens minted on Habitat'
          component='habitat-verc-list'
          ></habitat-preview-tool>
      <habitat-preview-tool
          title='Voting Module Registration'
          details='Verify & register a module with the Rollup'
          component='habitat-register-module'
          ></habitat-preview-tool>
      <habitat-preview-tool
          title='Liquidity Rewards'
          details='Calculates and displays the currently active LP rewards for each Epoch.'
          component='habitat-lp-list'
          ></habitat-preview-tool>
    </div>
  </div>
  `;

  constructor() {
    super();
  }

  get title () {
    return 'Habitat Tools';
  }
}
customElements.define('habitat-tools', HabitatTools);

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.wrapper {
  border-radius: 2em;
  background-color: var(--color-bg);
  max-width: max-content;
  padding: 2rem;
}
</style>
<div class='wrapper box'>
  <p id='title' class='bold m'> </p>
  <space></space>
  <p id='details' class='s light'> </p>
  <div>
    <button id='run' class='s'>Run Tool</button>
  </div>
  <div id='container'></div>
</div>
`;

const ATTR_TITLE = 'title';
const ATTR_DETAILS = 'details';
const ATTR_COMPONENT = 'component';

class HabitatPreviewTool extends HTMLElement {
  static get observedAttributes () {
    return [ATTR_TITLE, ATTR_DETAILS];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    wrapListener(this.shadowRoot.querySelector('#run'), this.run.bind(this));
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.shadowRoot.querySelector('#' + name).textContent = newValue;
  }

  async run () {
    const e = document.createElement(this.getAttribute(ATTR_COMPONENT));
    this.shadowRoot.querySelector('#container').replaceChildren(e);
  }
}
customElements.define('habitat-preview-tool', HabitatPreviewTool);
