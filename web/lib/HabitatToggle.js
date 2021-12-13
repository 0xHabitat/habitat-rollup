const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  color: var(--color-text);
  line-height: 1;
  vertical-align: bottom;
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
#inner.on {
  background-color: var(--color-bg-invert);
}
#inner.on > pin {
  margin-left: 1em;
}
#mode {
  margin: 0 .2em 0 .5em;
  position: relative;
}
#tooltip {
  display: block;
  position: absolute;
  top: -2px;
  right: -13px;
  font-size: .7em;
  width: 1em;
  height: 1em;
  border-radius: .3em;
  cursor: pointer;
  align-self: start;
  background-color: var(--color-bg-invert);
  visibility: hidden;
}
#tooltip > span {
  display: block;
  line-height: .9;
  color: var(--color-bg);
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
  flex-direction: row;
  align-items: center;
  padding-right: 10px;
}

#wrapper.column-mode {
    flex-direction: column-reverse;
}

#wrapper.column-mode #mode {
    margin-bottom: 8px;
}
</style>
<div id='wrapper'>
  <div id='inner'>
    <pin></pin>
  </div>
  <span id='mode'>
    <div id='tooltip'><span>ℹ</span><p id='content'> </p></div>
  </span>
  
</div>
`;

const ATTR_LEFT = 'left';
const ATTR_RIGHT = 'right';
const ATTR_TOOLTIP_LEFT = 'tooltip-left';
const ATTR_TOOLTIP_RIGHT = 'tooltip-right';
const ATTR_SWITCH = 'on';
const ATTR_COLUMN_MODE = 'column-mode';

class HabitatToggle extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_LEFT, ATTR_RIGHT, ATTR_TOOLTIP_LEFT, ATTR_TOOLTIP_RIGHT, ATTR_SWITCH, ATTR_COLUMN_MODE];
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

    render() {
        console.log("this.getAttribute(ATTR_COLUMN_MODE)", this.getAttribute(ATTR_COLUMN_MODE));
        console.log(this.getAttribute(ATTR_COLUMN_MODE) === "true");
        if (this.getAttribute(ATTR_COLUMN_MODE) === "true") {
            console.log("hier gehe ich rein");
            const wrapperSelector = this.shadowRoot.querySelector("#wrapper");
            wrapperSelector.classList.add("column-mode")
        }

    const right = this.shadowRoot.querySelector('#inner').classList.contains('on');
    const text = this.getAttribute(right ? ATTR_RIGHT : ATTR_LEFT);
      var tooltipContent = this.shadowRoot.querySelector("#tooltip").outerHTML;
      console.log(tooltipContent);
      var modeSelector = this.shadowRoot.querySelector("#mode").innerHTML = text + tooltipContent;
    const tooltipText = this.getAttribute(right ? ATTR_TOOLTIP_RIGHT : ATTR_TOOLTIP_LEFT);
    this.shadowRoot.querySelector('#tooltip').style.visibility = tooltipText ? 'initial' : 'hidden';
    this.shadowRoot.querySelector('#content').innerHTML = tooltipText;
  }
}
customElements.define('habitat-toggle', HabitatToggle);
