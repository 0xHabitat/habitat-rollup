const speeds = [.1, .5, 1, 1];
const layers = document.querySelectorAll('.para > div');
const numLayers = layers.length;
const parent = document.querySelector('.para').parentElement;
const baseZoom = 100;
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
  maxHeight = document.querySelector('.para').offsetHeight;
  isSmallScreen = (w / h) < 1.5;
  lastTop = 1;
  clampDeltaY = h / 7;

  if (isSmallScreen) {
    maxHeight = document.querySelector('.para').offsetWidth;
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

window.addEventListener('resize', onResize, false);
onResize();
window.requestAnimationFrame(renderScene);
