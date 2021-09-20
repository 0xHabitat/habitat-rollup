const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  vertical-align: bottom;
  box-sizing: border-box;
}
wrapper {
  display: block;
  width: 100%;
  border: 1px solid var(--color-purple);
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(99, 91, 255, 0.5) 6.42%, rgba(59, 222, 255, 0.5) 53.21%, rgba(28, 219, 158, 0.5) 98.54%);
}
inner {
  display: block;
  position: relative;
  border-radius: 6px;
  border: 1px solid var(--color-bg);
  height: 1rem;
  width: 100%;
  box-sizing: border-box;
  transition: all .07s linear;
  background: var(--color-bg);
  background-clip: content-box;
}
pin {
  display: block;
  position: relative;
  left: 0;
  width: .9rem;
  height: .9rem;
  max-width: .9rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  margin-left: -.45rem;
  border-radius: 100%;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.5);
  background-color: var(--color-white);
  cursor: pointer;
}
</style>
<wrapper><inner><pin></pin></inner></wrapper>
`;

class HabitatSlider extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this.wrapper = this.shadowRoot.querySelector('wrapper');
    this.inner = this.shadowRoot.querySelector('inner');
    this.pin = this.shadowRoot.querySelector('pin');

    this.active = false;
    this.scheduled = false;
    this.min = 0;
    this.cap = 0;
    this.max = 0;
    this.defaultValue = 0;
    this.value = 0;
    this.percent = 0;
    this._width = 0;
    this._x = 0;

    this.wrapper.addEventListener('mousedown', this, false);
    this.wrapper.addEventListener('mouseup', this, false);
    this.wrapper.addEventListener('mousemove', this, false);
    this.wrapper.addEventListener('mouseleave', this, false);
  }

  handleEvent (evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    this[evt.type](evt);
  }

  setRange (min, cap, max, defaultValue) {
    this.max = Number(max) || 1;
    this.cap = Number(cap);
    this.min = Number(min);
    this.defaultValue = defaultValue !== undefined ? Number(defaultValue) : this.cap;
    // trigger reset
    this._width = 0;

    this.scheduleUpdate();
  }

  mouseleave (evt) {
    if (!this.active) {
      return;
    }
    this.active = false;
    this._x = evt.offsetX;
    this.update();
    this.dispatchEvent(new Event('release'));
  }

  mousedown (evt) {
    this.active = true;
    this._width = this.wrapper.offsetWidth;
    if (evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  mouseup (evt) {
    this.active = false;
    this.scheduleUpdate();
    this.dispatchEvent(new Event('release'));
  }

  mousemove (evt) {
    if (!this.active || evt.target === this.pin) {
      return;
    }
    this._x = evt.offsetX;
    this.scheduleUpdate();
  }

  scheduleUpdate () {
    if (this._width === 0) {
      this._width = this.wrapper.offsetWidth;
      this._x = (this._width * (this.defaultValue / this.max));
      window.requestAnimationFrame(() => this.scheduleUpdate());
      return;
    }

    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    window.requestAnimationFrame(() => this.update());
  }

  update () {
    this.scheduled = false;
    const max = this.cap / this.max;
    const min = this.min / this.max;
    const x = Math.max(Math.min(this._width * max, this._x), this._width * min);
    this.percent = Math.round((x / this._width) * 100);
    this._x = x;
    this.value = Math.max(Math.min(this.cap, (this.max * this.percent) / 100), this.min);
    this.inner.style['padding-left'] = `${this.percent}%`;

    this.dispatchEvent(new Event('change'));
  }
}
customElements.define('habitat-slider', HabitatSlider);
