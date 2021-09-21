const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
:host {
  display: block;
  width: 100%;
  border: 1px solid var(--color-bg-invert);
  border-radius: 6px;
  background: linear-gradient(90deg, #579D83 0 4%, #6FAA82 4% 16%, #89B981 16% 23%, #99C281 23% 30%, #ADCE80 30% 40%, #CCE080 40% 45%, #D5E37E 45% 53%, #D6D87D 53% 61%, #E1C87B 61% 80%, #E8AF78 67% 80%, #F28F74 80% 93%, #F87972 93% 100%);
}

#inner {
  position: relative;
  border-radius: 6px;
  height: 1em;
  width: 100%;
  box-sizing: border-box;
  transition: all .07s linear;
  background: var(--color-bg);
  background-clip: content-box;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}
</style>
<div id='inner'></div>
`;

const ATTR_VALUE = 'value';

class HabitatSentimentSlider extends HTMLElement {
  static get observedAttributes () {
    return [ATTR_VALUE];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this.inner = this.shadowRoot.querySelector('#inner');
    this.focused = false;
    this.scheduled = false;
    this.value = 0;
    this._width = 0;
    this._x = 0;

    this.inner.addEventListener('mousedown', this, false);
    this.inner.addEventListener('mouseup', this, false);
    this.inner.addEventListener('mousemove', this, false);
    this.inner.addEventListener('mouseleave', this, false);
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === ATTR_VALUE) {
      this.value = Number(newValue);
      this.defaultValue = this.value;
    }

    this._width = 0;
    this.scheduleUpdate(true);
  }

  handleEvent (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    this[evt.type](evt);
  }

  mouseleave (evt) {
    if (!this.focused) {
      return;
    }
    this.focused = false;
    this._x = evt.offsetX;
    this.update();
    this.dispatchEvent(new Event('release'));
  }

  mousedown (evt) {
    this.focused = true;
    this._width = this.offsetWidth;
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  mouseup (evt) {
    this.focused = false;
    this.scheduleUpdate();
    this.dispatchEvent(new Event('release'));
  }

  mousemove (evt) {
    if (!this.focused) {
      return;
    }
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  scheduleUpdate (doNotCalculate = false) {
    if (this._width === 0) {
      this._width = this.offsetWidth;
    }

    if (doNotCalculate) {
      this.value = Math.min(1, Math.max(0, this.value));
    } else {
      const f = this._width / 32;
      if (this._x <= f) {
        this._x = 0;
      } else if (this._x >= this._width - f) {
        this._x = this._width;
      }
      this.value = Math.min(1, Math.max(0, (this._x / this._width)));
    }

    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    window.requestAnimationFrame(() => this.update());
  }

  update () {
    this.scheduled = false;
    this.inner.style['padding-left'] = `${Math.min(100, this.value * 100)}%`;

    if (this.value !== this.defaultValue) {
      this.dispatchEvent(new Event('change'));
    }
  }
}
customElements.define('habitat-sentiment-slider', HabitatSentimentSlider);
