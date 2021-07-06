import {
  getTokenV2,
  getEtherscanTokenLink,
} from './utils.js';

const TEMPLATE =
`
<style>
habitat-token-element img {
  height: 1em;
  width: 1em;
  margin-right: .3em;
}
</style>
<a target='_blank' class='flex row'>
<img>
<span></span>
</a>
`;
const ATTR_TOKEN = 'token';

export default class HabitatTokenElement extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_TOKEN];
  }

  constructor() {
    super();
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
    }
    return this.update();
  }

  async update () {
    const token = await getTokenV2(this.getAttribute(ATTR_TOKEN));
    this.children[1].href = getEtherscanTokenLink(token.address);

    const children = this.children[1].children;
    children[0].src = token.logoURI;
    children[1].textContent = token.symbol;
  }
}
customElements.define('habitat-token-element', HabitatTokenElement);
