const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  box-sizing: border-box;
}
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
// #inner.on {
//   background-color: var(--color-bg-invert);
// }
#inner.on > pin {
  margin-left: 1em;
}
#mode {
  margin: 0 .2em 2px 0;
  color: white;
  font-family: arial;
  font-style: normal;
  font-size: 14px;
  line-height: 18px;
}
#tooltip {
  display: block;
  font-size: .7em;
  width: 1em;
  height: 1em;
  border-radius: .3em;
  cursor: pointer;
  align-self: start;
  background-color: var(--color-bg-invert);
  visibility: hidden;
  margin-top: -4px;
}
#tooltip > span {
  display: block;
  line-height: .9;
}
#tooltip > #content {
  display: none;
  position: absolute;
  background-color: var(--color-bg-invert);
  color: var(--color-bg);
  transform: translateY(calc(-100% - 2.25em)) translateX(calc(-100% + 1.25em));
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
  bottom: -.2em;
  width: .5em;
  height: .5em;
  transform: rotateZ(45deg);
  background-color: var(--color-bg-invert);
}
#wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}
#top{
  display: flex;
  flex-direction: row;
}
</style>
<div id='top'>
<div id='wrapper'>
  <span id='mode'></span>
  <div id='inner'>
    <pin></pin>
  </div>
</div>
<div id='tooltip'>
<svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.77778 0.00537109C0.791111 0.00537109 0 0.796482 0 1.78315V8.00537H1.77778H6.22222C7.20889 8.00537 8 7.21426 8 6.22759V1.78315C8 0.796482 7.20889 0.00537109 6.22222 0.00537109H1.77778ZM4 1.3387C4.48889 1.3387 4.88889 1.7387 4.88889 2.22759C4.88889 2.71648 4.48889 3.11648 4 3.11648C3.51111 3.11648 3.11111 2.71648 3.11111 2.22759C3.11111 1.7387 3.51111 1.3387 4 1.3387ZM3.55556 3.56093H4.44444C4.69333 3.56093 4.88889 3.75648 4.88889 4.00537V6.22759C4.88889 6.47648 4.69333 6.67204 4.44444 6.67204H3.55556C3.30667 6.67204 3.11111 6.47648 3.11111 6.22759V4.00537C3.11111 3.75648 3.30667 3.56093 3.55556 3.56093Z" fill="white"/>
</svg>
<p id='content'> </p></div>
</div>
`;

const ATTR_LEFT = 'left';
const ATTR_RIGHT = 'right';
const ATTR_TOOLTIP_LEFT = 'tooltip-left';
const ATTR_TOOLTIP_RIGHT = 'tooltip-right';
const ATTR_SWITCH = 'on';

class HabitatToggle extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_LEFT, ATTR_RIGHT, ATTR_TOOLTIP_LEFT, ATTR_TOOLTIP_RIGHT, ATTR_SWITCH];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));
    this.shadowRoot.querySelector('#inner').addEventListener('click', () => {
      this.shadowRoot.querySelector('#inner').classList.toggle('on');
      this.render();
      this.dispatchEvent(new Event('toggle'));
    }, false);
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === ATTR_SWITCH) {
      const e = this.shadowRoot.querySelector('#inner');
      if (newValue === '1') {
        e.classList.add('on');
      } else {
        e.classList.remove('on');
      }
    }
    this.render();
  }

  render () {
    const right = this.shadowRoot.querySelector('#inner').classList.contains('on');
    const text = this.getAttribute(right ? ATTR_RIGHT : ATTR_LEFT);
    this.shadowRoot.querySelector('#mode').textContent = text;

    const tooltipText = this.getAttribute(right ? ATTR_TOOLTIP_RIGHT : ATTR_TOOLTIP_LEFT);
    this.shadowRoot.querySelector('#tooltip').style.visibility = tooltipText ? 'initial' : 'hidden';
    this.shadowRoot.querySelector('#content').innerHTML = tooltipText;
  }
}
customElements.define('habitat-toggle', HabitatToggle);