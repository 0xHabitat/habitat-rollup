import { onChainUpdate } from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE =
`
<style>
#titlebar {
  display: flex;
  background:black;
  color:white;
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
  overflow-y: overlay;
  box-sizing: border-box;
  height: calc(100% - 2em);
  border-left: 1px solid black;
  background: transparent;
  transition: none;
}
:host(.contentHidden) #content {
  content-visibility: hidden;
  visibility: hidden;
  /* fixes rendering issues on some browsers */
  opacity: 0;
}
</style>
<div id='titlebar'>
  <a id='close' style='color:beige;'>&#10006;</a>
  <a id='title' style='color:white;width:100%;'></a>
</div>
<div id='content'></div>
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
