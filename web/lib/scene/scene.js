const speeds = [.1, .5, 1, 1];
const baseZoom = 100;
let layers;
let numLayers;
let container;
let parent;
let maxWidth = 0;
let stop = false;
let lastTop = 1;
let maxHeight = 0;
let clampDeltaY = 0;
let isSmallScreen = false;

function onResize () {
  const w = document.body.offsetWidth;
  const h = document.body.offsetHeight
  maxWidth = w;
  maxHeight = container.offsetHeight;
  isSmallScreen = (w / h) < 1.5;
  lastTop = 1;
  clampDeltaY = h / 7;

  if (isSmallScreen) {
    maxHeight = container.offsetWidth;
  }
}

function renderScene () {
  window.requestAnimationFrame(renderScene);

  const scrollY = ~~parent.scrollTop;

  if (isSmallScreen) {
    if (maxHeight - scrollY <= maxWidth) {
      return;
    }
  }
  if (scrollY < lastTop) {
    stop = false;
  }
  if (scrollY === lastTop || stop) {
    return;
  }

  const x = Math.min(1000, Math.max(1, ~~(Math.abs(lastTop - scrollY) / 4)));
  if (scrollY > lastTop) {
    lastTop += x;
  } else {
    lastTop -= x;
  }

  let prevLayerY = 0;
  for (let i = 0; i < numLayers; i++) {
    const speed = speeds[i];
    const offset = Math.max(0, (lastTop * speed));
    const scale = Math.max(0, (baseZoom - lastTop) * speed) + i;
    const layer = layers[i];

    if (isSmallScreen) {
      const x = lastTop;
      layer.style.transform = `translate3d(-${x}px, ${offset * .2}px, ${scale}px)`;
    } else {
      if (i > 0 && offset - prevLayerY > clampDeltaY) {
        stop = true;
        break;
      }
      prevLayerY = offset;
      layer.style.transform = `translate3d(0, -${offset}px, ${scale}px)`;
    }
  }
}

const TEMPLATE =
`
<div class='para'>
  <div class='l1'></div>
  <div class='l2'></div>
  <div class='l3'></div>
  <div class='l4' style='width:100%;'>
    <!---
    <a href='/'><object type='image/svg+xml' style='position:absolute;top:6rem;width:20rem;left:6rem;' data='/lib/assets/v2-logo-full.svg'></object></a>
    <h1><br></h1>
    --->
    <div class='left padh' style='left:6rem;bottom:3vh;position:absolute;font-size:2vh;max-width:70vw;'>
      <h1 class='whitetext'>Scaling DAO & Coordination Solutions</h1>
      <h3 class='whitetext'>Easily participate, collaborate and experiment on a Optimistic Rollup</h3>
    </div>
  </div>
`;

class HabitatScene extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = TEMPLATE;
    layers = this.querySelectorAll('.para > div');
    numLayers = layers.length;
    container = this.children[0];
    parent = this.parentElement;
    window.addEventListener('resize', onResize, false);
    onResize();
    window.requestAnimationFrame(renderScene);
  }
}

customElements.define('habitat-scene', HabitatScene);
