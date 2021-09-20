const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
@keyframes loop {
  0% {
    transform-origin: 0% 0%;
  }
  25%{
    transform-origin: 25% 50%;
  }
  50% {
    transform-origin: 50% 70%;
  }
  75% {
    transform-origin: 30% 100%;
  }
  100% {
    transform-origin: 0% 100%;
  }
}
canvas {
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: scale(3) translateZ(0);
  animation: loop 30s ease-in-out alternate infinite;
  will-change: transform;
  filter: brightness(var(--habitat-background-brightness, 1));
}
</style>
<canvas width='8' height='8'></canvas>
`;

const MAX_LIGHTNESS = 10;
const MIN_LIGHTNESS = 80;
const SATURATION = 100;

function minmax (v) {
  return Math.max(Math.min(MAX_LIGHTNESS, v), MIN_LIGHTNESS);
}

function drawPixel ({ x, y, min, max, lightness, ctx }) {
  min = min | 0;
  max = max | 0;

  let velocity = (Math.random() * 30 + 20) * 0.01 * (Math.random() > 0.5 ? -1 : 1);
  lightness = minmax((lightness || 80) + (velocity * .5));

  if (lightness === MAX_LIGHTNESS || lightness === MIN_LIGHTNESS) {
    velocity = velocity - velocity - velocity;
  }

  let hue = (Math.floor(Math.floor(Math.random() * 360) + velocity) % 360) || 0;

  const color = `hsla(${Math.round(hue)}, ${SATURATION}%, ${lightness}%, .5)`;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.fillRect(x, y, 1, 1);
}

class HabitatBackground extends HTMLElement {
  constructor () {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    const canvas = this.shadowRoot.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        if (y % 2 === 0) {
          drawPixel({ ctx, x, y, min: 180, max: 190, lightness: x % 2 ? 80 : 50 });
        } else {
          drawPixel({ ctx, x, y, min: 160, max: 190, lightness: x % 2 ? 50 : 80 });
        }
      }
    }
  }
}
customElements.define('habitat-background', HabitatBackground);
