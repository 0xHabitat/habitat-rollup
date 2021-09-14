import {
  wrapListener,
  parseInput,
  ethers,
  getConfig,
} from './utils.js';
import {
  getProviders,
  sendTransaction,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const { VERC_FACTORY_ADDRESS } = getConfig();

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
    <input id='name' placeholder='Token Name'>
    <input id='symbol' placeholder='Token Symbol (Ticker)'>
    <input id='decimals' placeholder='Decimal places, most token use 18' type='number'>
    <input id='totalSupply' placeholder='Total Supply'>
  </div>
  <space></space>
  <center>
    <p id='feedback' class='s'> </p>
  </center>
  <div>
    <button id='create'>Create</button>
    <space></space>
  </div>
</div>
`;

export default class HabitatVERCCreator extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    wrapListener(this.shadowRoot.querySelector('#create'), this.create.bind(this));
  }

  async create () {
    if (this.shadowRoot.querySelector('#create').textContent === 'Close') {
      this.remove();
      return;
    }

    const obj = parseInput(this.shadowRoot.querySelector('#input'));
    if (obj.error) {
      return;
    }

    let { name, symbol, decimals, totalSupply } = obj.config;

    if (decimals < 1 || decimals > 255) {
      throw new Error('invalid decimal places');
    }
    totalSupply = ethers.utils.parseUnits(totalSupply, decimals);
    symbol = symbol.trim().toUpperCase();
    name = name.trim();

    const { rootProvider } = await getProviders();
    const chainId = (await rootProvider.getNetwork()).chainId;
    const domainHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('EIP712Domain(string name,uint256 chainId)'));
    const tokenNameHash = ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes(name)]);
    const domainSeparator = ethers.utils.keccak256(
      ethers.utils.hexConcat(
        [
        domainHash,
        tokenNameHash,
        '0x' + chainId.toString(16).padStart(64, '0')
        ]
      )
    );

    const args = {
      factoryAddress: VERC_FACTORY_ADDRESS,
      args: ethers.utils.defaultAbiCoder.encode(
        ['string', 'string', 'uint8', 'uint256', 'bytes32'],
        [name, symbol, decimals, totalSupply, domainSeparator]
      ),
    };
    const receipt = await sendTransaction('CreateVirtualERC20', args);
    console.log(receipt.events);
    const address = receipt.events[0].args[1];
    this.shadowRoot.querySelector('#feedback').textContent = `Token(${address}) successfully created, the total supply was sent to your account.`;
    this.shadowRoot.querySelector('#create').textContent = 'Close';
  }
}
customElements.define('habitat-verc-creator', HabitatVERCCreator);
