import { onChainUpdate } from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE =
`
<style>
#titlebar {
  display: flex;
  background:black;
  color:white;
  padding:.3em;
  font-weight: normal;
}
#titlebar > a {
  margin: 0;
  padding: .3em;
  cursor: pointer;
  white-space: pre;
}
#content {
  overflow: hidden;
  overflow-y: scroll;
  box-sizing: border-box;
  height: 100%;
  padding-bottom: 3em;
}
:host(.contentHidden) #content {
  content-visibility: hidden;
  visibility: hidden;
}
</style>
<div id='titlebar'>
  <a id='close' style='color:beige;'>&#10006;</a>
  <a id='title' style='color:white;width:100%;'></a>
</div>
<div id='content' style='background:var(--color-bg);'></div>
`;

export default class HabitatPanel extends HTMLElement {
  static TEMPLATE = '';

  static get observedAttributes() {
    return ['args'];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    const template = document.createElement('template');
    template.innerHTML = TEMPLATE;
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), template.content);

    this.shadowRoot.querySelector('a#close').addEventListener('click', () => {
      this.remove();
      window.location.hash = '';
    }, false);

    this.shadowRoot.querySelector('#content').innerHTML = this.constructor.TEMPLATE;

    // defer
    window.requestAnimationFrame(() => {
      this.classList.add('habitat-panel');
      onChainUpdate(this._chainUpdateCallback.bind(this));
    });
  }

  connectedCallback () {
  }

  get title () {
    return this._title || 'no title';
  }

  setTitle (str) {
    this._title = str;
    this.shadowRoot.querySelector('a#title').textContent = str;
    document.title = str;
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'args') {
      this.setTitle(this.title);
      this.shadowRoot.querySelector('a#title').href = newValue;
    }

    if (oldValue !== newValue) {
      if (this.render) {
        this.render();
      }
    }
  }

  async _chainUpdateCallback () {
    if (!this.isConnected) {
      return;
    }
    onChainUpdate(this._chainUpdateCallback.bind(this));

    if (this.chainUpdateCallback) {
      await this.chainUpdateCallback();
    }
  }
}
customElements.define('habitat-panel', HabitatPanel);
