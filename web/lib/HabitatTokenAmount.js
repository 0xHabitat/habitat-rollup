import {
  renderAmount,
  getToken,
  getTokenSymbol,
  getEtherscanTokenLink,
} from './utils.js';

const TEMPLATE =
`
<span></span>
<a target='_blank'></a>
`;
const ATTR_TOKEN = 'token';
const ATTR_AMOUNT = 'amount';

export default class HabitatTokenAmount extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_TOKEN, ATTR_AMOUNT];
  }

  constructor() {
    super();
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
    }
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    return this.update();
  }

  async update () {
    const erc = await getToken(this.getAttribute(ATTR_TOKEN));
    const value = this.getAttribute(ATTR_AMOUNT);
    const symbol = await getTokenSymbol(erc.address);

    this.children[0].textContent = renderAmount(value, erc._decimals);
    this.children[1].textContent = symbol;
    this.children[1].href = getEtherscanTokenLink(erc.address);
  }
}

customElements.define('habitat-token-amount', HabitatTokenAmount);
