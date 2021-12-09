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

const CELEBRATION = `<div id='celebration' class='flex left m'>
<p style='padding:1em;'>Success! 🎉 Your token has been created. The total supply was sent to your address.</p>
</div>`;

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.wrapper {
  border-radius: 2em;
  background-color: #C4C4C4;
  padding: 1rem;
  width: 100%;
}
input {
  margin-bottom: 1em;
  color: var(--color-text);
  border-radius: 2em;
  border: 1px solid var(--color-accent-grey);
  background-color: var(--color-bg);
  min-width: 14ch;
  width: 100%;
  height: 1em;
  font-weight: 300;
}
</style>
<div>
  <div class='wrapper'>
    <div id='input' class='flex col'>
      <input id='name' placeholder='Token Name'>
      <input id='symbol' placeholder='Token Ticker (e.g. HBT)'>
      <input id='decimals' placeholder='Decimal Places (most tokens use 18)' type='number'>
      <input id='totalSupply' placeholder='Total Supply'>
    </div>
    <div style='width:100%;position:relative;'>
      <button id='create' style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10em;padding:.5em 1em .5em 1em;'>Create Token</button>
    </div>
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
    console.log(`Token(${address}) successfully created, the total supply was sent to your account.`);

    //response celebration
    const parentShadowRoot = this.parentElement.getRootNode();
    const createToken = parentShadowRoot.querySelector('#create-token') || '';
    if (createToken) {
      createToken.replaceWith(createToken.cloneNode(true))
      this.shadowRoot.querySelector('.wrapper').parentElement.innerHTML = `${CELEBRATION}`;
    }
  }
}
customElements.define('habitat-verc-creator', HabitatVERCCreator);
