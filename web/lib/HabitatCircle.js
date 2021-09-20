const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  box-sizing: border-box;
  vertical-align: bottom;
  line-height: 1;
  margin: 0;
  margin-block: 0;
}
circle {
  display: block;
  width: 10em;
  height: 10em;
  border-radius: 100%;
  padding: .1%;
  box-shadow: inset 0px 0px 4px rgba(0, 0, 0, 0.5);
  background-blend-mode: color-dodge;
}
inner {
  display: flex;
  flex-direction: column;
  place-content: center;
  align-items: center;
  width: calc(100% - 1em);
  height: calc(100% - 1em);
  margin: .5em;
  border-radius: 100%;
  background-color: var(--color-bg);
}
</style>
<circle>
  <inner>
    <h1 id='signal'>-</h1>
    <p id='tag'> </p>
  </inner>
</circle>`;

export default class HabitatCircle extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this._signalElement = this.shadowRoot.querySelector('#signal');
    this._tag = this.shadowRoot.querySelector('#tag');
  }

  setValue (signalStrength, val, tag) {
    const color = window.getComputedStyle(this).getPropertyValue('--circle-gradient') || 'black';
    this._signalElement.parentElement.parentElement.style.background =
      `linear-gradient(180deg, var(--color-bg) ${100 - signalStrength}%, ${color})`;

    this._signalElement.textContent = val;
    this._tag.textContent = tag || this.getAttribute('tag') || ' ';
  }
}
customElements.define('habitat-circle', HabitatCircle);
