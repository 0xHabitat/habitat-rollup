const BASE = import.meta.url.split('/').slice(0, -1).join('/');
const SPEEDS = [.1, .5, 1, 1];
const BASE_ZOOM = 100;
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.whitetext {
  color: var(--color-white);
  text-shadow: 0 1px 6px black;
  line-height: 1.2;
}
.para {
  width: 100%;
  min-width: 170vh;
  max-width: 97em;
  margin: 0 auto;
  height: 120vh;
  overflow: hidden;
  transform: translateZ(1px);
  perspective: 1000px;
  animation: none;
  transition: none;
}
.para > div {
  height: 110vh;
  position: absolute;
  transition: all .07s linear;
  animation: none;
}
@keyframes scene {
  from {
    perspective: 600px;
    perspective-origin: left;
  }
  to {
    perspective: 1000px;
    perspective-origin: center;
  }
}
.l1, .l2, .l3 {
  width: 100%;
  background-repeat: no-repeat;
  background-size: cover;
}
.l1 {
  z-index: 1;
  background-image: url('${BASE}/day/1.png');
  background-image: -webkit-image-set(url('${BASE}/day/1.webp') 1x);
}
:host([webp-fallback]) .l1 {
  background-image: url('${BASE}/day/1.png');
}
.l2 {
  z-index: 2;
  background-image: url('${BASE}/day/2.png');
  background-image: -webkit-image-set(url('${BASE}/day/2.webp') 1x);
}
:host([webp-fallback]) .l2 {
  background-image: url('${BASE}/day/2.png');
}
.l3 {
  z-index: 3;
  background-image: url('${BASE}/day/3.png');
  background-image: -webkit-image-set(url('${BASE}/day/3.webp') 1x);
}
:host([webp-fallback]) .l3 {
  background-image: url('${BASE}/day/3.png');
}
.l4 {
  z-index: 4;
}
:host([data-theme="dark"]) .l1 {
  background-image: url('${BASE}/night/1.png');
  background-image: -webkit-image-set(url('${BASE}/night/1.webp') 1x);
}
:host([data-theme="dark"][webp-fallback]) .l1 {
  background-image: url('${BASE}/night/1.png');
}
:host([data-theme="dark"]) .l2 {
  background-image: url('${BASE}/night/2.png');
  background-image: -webkit-image-set(url('${BASE}/night/2.webp') 1x);
}
:host([data-theme="dark"][webp-fallback]) .l2 {
  background-image: url('${BASE}/night/2.png');
}
:host([data-theme="dark"]) .l3 {
  background-image: url('${BASE}/night/3.png');
  background-image: -webkit-image-set(url('${BASE}/night/3.webp') 1x);
}
:host([data-theme="dark"][webp-fallback]) .l3 {
  background-image: url('${BASE}/night/3.png');
}
:host(:not([x-ready])) .para > * {
  background-image: none !important;
}
</style>
<div class='para'>
  <div class='l1'></div>
  <div class='l2'></div>
  <div class='l3'></div>
  <div class='l4' style='width:100%;'>
    <div style='left:6rem;bottom:3vh;position:absolute;font-size:2vh;max-width:70vw;text-align:left;'>
      <h1 class='whitetext'>Scaling DAO & Coordination Solutions</h1>
      <h3 class='whitetext'>Easily participate, collaborate and experiment on a Optimistic Rollup</h3>
    </div>
  </div>
</div>`;

const ATTRS = ['data-theme', 'webp-fallback', 'x-ready'];

class HabitatScene extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this.ctx = {
      layers: this.shadowRoot.querySelectorAll('.para > div'),
      container: this.shadowRoot.children[1],
      maxWidth: 0,
      maxHeight: 0,
      lastTop: 1,
      clampDeltaY: 0,
      isSmallScreen: false,
      stop: false,
    };
  }

  connectedCallback () {
    window.addEventListener('resize', this, false);
    window.addEventListener('message', this, false);
    this.update();
    this.resize();
    this.renderScene();
  }

  disconnectedCallback () {
    window.removeEventListener('resize', this, false);
    window.removeEventListener('message', this, false);
  }

  handleEvent (evt) {
    this[evt.type](evt);
  }

  message (evt) {
    if (evt.source !== window) {
      return;
    }

    if (ATTRS.indexOf(evt.data) !== -1) {
      this.update();
    }
  }

  update () {
    for (const attr of ATTRS) {
      const v = document.documentElement.getAttribute(attr);
      if (attr == ATTRS[0] && !v) {
        // defer
        return;
      }
      if (v != undefined) {
        this.setAttribute(attr, v);
      }
    }
  }

  resize () {
    const w = document.body.offsetWidth;
    const h = document.body.offsetHeight
    this.ctx.maxWidth = w;
    this.ctx.maxHeight = this.ctx.container.offsetHeight;
    this.ctx.isSmallScreen = (w / h) < 1.5;
    this.ctx.lastTop = 1;
    this.ctx.clampDeltaY = h / 7;

    if (this.ctx.isSmallScreen) {
      this.ctx.maxHeight = this.ctx.container.offsetWidth;
    }
  }

  renderScene () {
    if (!this.isConnected) {
      return;
    }

    window.requestAnimationFrame(this.renderScene.bind(this));

    const scrollY = ~~this.parentElement.scrollTop;

    if (this.ctx.isSmallScreen) {
      if (this.ctx.maxHeight - scrollY <= this.ctx.maxWidth) {
        return;
      }
    }
    if (scrollY < this.ctx.lastTop) {
      this.ctx.stop = false;
    }
    if (scrollY === this.ctx.lastTop || this.ctx.stop) {
      return;
    }

    const x = Math.min(1000, Math.max(1, ~~(Math.abs(this.ctx.lastTop - scrollY) / 4)));
    if (scrollY > this.ctx.lastTop) {
      this.ctx.lastTop += x;
    } else {
      this.ctx.lastTop -= x;
    }

    const numLayers = this.ctx.layers.length;
    let prevLayerY = 0;
    for (let i = 0; i < numLayers; i++) {
      const speed = SPEEDS[i];
      const offset = Math.max(0, (this.ctx.lastTop * speed));
      const scale = Math.max(0, (BASE_ZOOM - this.ctx.lastTop) * speed) + i;
      const layer = this.ctx.layers[i];

      if (this.ctx.isSmallScreen) {
        const x = this.ctx.lastTop;
        layer.style.transform = `translate3d(-${x}px, ${offset * .2}px, ${scale}px)`;
      } else {
        if (i > 0 && offset - prevLayerY > this.ctx.clampDeltaY) {
          this.ctx.stop = true;
          break;
        }
        prevLayerY = offset;
        layer.style.transform = `translate3d(0, -${offset}px, ${scale}px)`;
      }
    }
  }
}
customElements.define('habitat-scene', HabitatScene);
