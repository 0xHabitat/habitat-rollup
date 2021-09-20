import {
  getTokenV2,
  getEtherscanTokenLink,
} from './utils.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  line-height: 1;
  vertical-align: bottom;
  white-space: nowrap;
  word-break: keep-all;
  color: var(--color-text);
  text-decoration: none;
  box-sizing: border-box;
}
img {
  height: 1em;
  width: 1em;
  margin-right: .3em;
}
</style>
<div>
  <a target='_blank'>
    <img>
    <span></span>
  </a>
</div>
`;
const ATTR_TOKEN = 'token';

export default class HabitatTokenElement extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_TOKEN];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));
  }

  attributeChangedCallback (name, oldValue, newValue) {
    return this.update();
  }

  async update () {
    const token = await getTokenV2(this.getAttribute(ATTR_TOKEN));
    this.shadowRoot.querySelector('a').href = getEtherscanTokenLink(token.address);
    this.shadowRoot.querySelector('img').src = token.logoURI;
    this.shadowRoot.querySelector('span').textContent = token.symbol;
  }
}
customElements.define('habitat-token-element', HabitatTokenElement);
