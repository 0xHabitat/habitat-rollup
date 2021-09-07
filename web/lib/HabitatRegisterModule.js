import {
  wrapListener,
  parseInput,
  ethers,
  getSigner,
} from './utils.js';
import {
  getProviders,
  encodeMetadata,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.wrapper {
  border-radius: 2em;
  background-color: var(--color-bg);
  max-width: max-content;
  padding: 1rem;
}
input {
  border: none;
  border-bottom: 1px solid var(--color-bg-invert);
}
</style>
<div class='wrapper'>
  <div id='input' class='flex col'>
    <input id='contractAddress' placeholder='Contract Address of the Module'>
    <input id='name' placeholder='Name/Title of the Module'>
    <input id='flavor' placeholder='Select the Voting Flavor or enter a custom value' list='flavorlist'>
    <datalist id='flavorlist'>
      <option>binary</option>
      <option>signal</option>
    </datalist>
    <textarea id='details' placeholder='What is this module about? How does it work?'></textarea>
  </div>
  <space></space>
  <center>
    <p id='feedback' class='s'> </p>
  </center>
  <div>
    <button id='create'>Submit</button>
    <space></space>
  </div>
</div>
`;

export default class HabitatRegisterModule extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    wrapListener(this.shadowRoot.querySelector('#create'), this.create.bind(this));
  }

  async create () {
    const btn = this.shadowRoot.querySelector('#create');
    if (btn.textContent === 'Close') {
      this.remove();
      return;
    }

    const obj = parseInput(this.shadowRoot.querySelector('#input'));
    if (obj.error) {
      return;
    }

    let { contractAddress, flavor, name, details } = obj.config;
    const { rootProvider, bridge } = await getProviders();
    const bytecode = await rootProvider.getCode(contractAddress);

    if (bytecode === '0x') {
      throw new Error('invalid contract');
    }

    const metadata = {
      version: 1,
      flavor: flavor,
      name,
      details,
    };
    // register module
    const args = [
      1,
      contractAddress,
      ethers.utils.keccak256(bytecode),
      encodeMetadata(metadata)
    ];

    const feedback = this.shadowRoot.querySelector('#feedback');
    const tx = await bridge.connect(await getSigner()).registerModule(...args);
    console.log(tx.hash, 'registerModule', ...args);
    feedback.textContent = 'Pending';
    const receipt = await tx.wait();
    feedback.textContent = 'Success';
    btn.textContent = 'Close';
  }
}
customElements.define('habitat-register-module', HabitatRegisterModule);
