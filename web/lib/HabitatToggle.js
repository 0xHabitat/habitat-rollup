import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
#inner,
pin {
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

#inner {
  height: 1em;
  width: 2em;
  border-radius: 2em;
  border: 1px solid var(--color-bg-invert);
  transition: all .07s linear;
  background: var(--color-bg);
  background-clip: content-box;
  transition: background .2s ease-in;
}

pin {
  display: block;
  position: relative;
  top: -1px;
  left: -1px;
  width: 1em;
  height: 1em;
  max-width: 1em;
  min-width: 0;
  margin: 0;
  padding: 0;
  margin-left: 0;
  border-radius: 100%;
  border: 1px solid var(--color-bg-invert);
  cursor: pointer;
  background-color: var(--color-bg);
  transition: margin .2s ease-in;
}

#inner.on {
  background-color: var(--color-bg-invert);
}

#inner.on > pin {
  margin-left: 1em;
}

#mode {
  margin: 0 .2em 0 .5em;
}

#tooltip {
  display: inline-block;
  font-size: .7em;
  width: 1em;
  height: 1em;
  border-radius: .3em;
  cursor: pointer;
  align-self: start;
  background-color: var(--color-bg-invert);
}

#tooltip > span {
  color: var(--color-bg);
  line-height: .7;
}

#tooltip > #content {
  display: none;
  position: absolute;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
  transform: translateY(calc(-100% - 1em)) translateX(calc(-100% + 1.25em));
}

#tooltip:hover > #content {
  display: block;
}

#content {
  padding: .5em 1em;
  border-radius: .5em;
  min-width: 20em;
}

#content::before {
  content: '';
  display: block;
  position: absolute;
  right: .5em;
  bottom: -.25em;
  width: .5em;
  height: .5em;
  transform: rotateZ(45deg);
  background-color: var(--color-bg-invert);
}
</style>
<div class='flex row'>
  <div id='inner'>
    <pin></pin>
  </div>
  <span id='mode' class='light'></span>
  <div id='tooltip'><span>ℹ</span><p id='content'>asd</p></div>
</div>
`;

const ATTR_LEFT = 'left';
const ATTR_RIGHT = 'right';
const ATTR_TOOLTIP_LEFT = 'tooltip-left';
const ATTR_TOOLTIP_RIGHT = 'tooltip-right';

class HabitatToggle extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_LEFT, ATTR_RIGHT, ATTR_TOOLTIP_LEFT, ATTR_TOOLTIP_RIGHT];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
    this.shadowRoot.querySelector('#inner').addEventListener('click', () => {
      this.shadowRoot.querySelector('#inner').classList.toggle('on');
      this.render();
      this.dispatchEvent(new Event('toggle'));
    }, false);
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.render();
  }

  render () {
    const right = this.shadowRoot.querySelector('#inner').classList.contains('on');
    const text = this.getAttribute(right ? ATTR_RIGHT : ATTR_LEFT);
    this.shadowRoot.querySelector('#mode').textContent = text;

    const tooltipText = this.getAttribute(right ? ATTR_TOOLTIP_RIGHT : ATTR_TOOLTIP_LEFT);
    this.shadowRoot.querySelector('#tooltip').style.visibility = tooltipText ? 'visible' : 'hidden';
    this.shadowRoot.querySelector('#content').innerHTML = tooltipText;
  }
}
customElements.define('habitat-toggle', HabitatToggle);
