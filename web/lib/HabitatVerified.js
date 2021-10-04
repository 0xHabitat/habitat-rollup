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
.verified::after {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-left: -.5em;
  font-size: .5em;
  border-radius: 50%;
  vertical-align: top;
  text-align: center;
  cursor: pointer;
  color: white;
  content: 'ℹ';
}
.verified {
  position: relative;
}
.verified > span {
  display: none;
  position: absolute;
  padding: .5em 1em;
  border-radius: .5em;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
  transform: translateY(calc(-100% - .5em));
}
.verified > span::before {
  content: '';
  display: block;
  position: absolute;
  left: 1em;
  bottom: -.2em;
  width: .5em;
  height: .5em;
  transform: rotateZ(45deg);
  background-color: var(--color-bg-invert);
}
.verified:hover > span {
  display: block;
}
:host([verified]) > .verified::after {
  background-color: green;
}
:host(:not([verified])) > .verified::after {
  background-color: orange;
}
</style>
<span class='verified'>
  <span id='tooltip'></span>
  <slot name='body'></slot>
</span>
`;
const ATTR_VERIFIED = 'verified';
const ATTR_TOOLTIP_SECURE = 'secure';
const ATTR_TOOLTIP_INSECURE = 'insecure';

export default class HabitatVerified extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_VERIFIED, ATTR_TOOLTIP_SECURE, ATTR_TOOLTIP_INSECURE];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.shadowRoot.querySelector('#tooltip').textContent =
      this.hasAttribute(ATTR_VERIFIED) ? this.getAttribute(ATTR_TOOLTIP_SECURE) : this.getAttribute(ATTR_TOOLTIP_INSECURE);
  }
}
customElements.define('habitat-verified', HabitatVerified);
