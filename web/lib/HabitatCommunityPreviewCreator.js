import {
  setupTokenlistV2,
  wrapListener,
  getTokenV2,
  parseInput,
} from './utils.js';
import {
  encodeMetadata,
  sendTransaction
} from './rollup.js';
import { ipfsPush } from './ipfs.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.communityBox {
  border-radius: 2em;
  background-color: var(--color-accent-grey);
  cursor: pointer;
}
.communityBox canvas {
  width: 40ch;
  max-width: 100%;
  border-radius: 2em;
}
.communityBox input {
  border: none;
  border-bottom: 1px solid var(--color-bg-invert);
}
</style>
<div class='communityBox'>
  <space></space>
  <div id='input' class='flex col'>
    <input id='title' placeholder='Name of Community'>
    <input id='details' placeholder='Short Description about the Community'>
    <input id='token' placeholder='Governance Token' list='tokenlistv2'>
  </div>
  <space></space>
  <input style='display:none;' id='file' type='file' accept='image/*'>
  <p></p>
  <label style='padding:1em;'>
    Tap on the area below to add a community banner.
    <br>
    Aspect ratio is 2:1. i.e 1200x600
  </label>
  <canvas></canvas>
  <div>
    <button id='create'>Create</button>
  </div>
</div>
`;

export default class HabitatCommunityPreviewCreator extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._ctx = this.shadowRoot.querySelector('canvas').getContext('2d');
    this._fileInput = this.shadowRoot.querySelector('#file');
    this.shadowRoot.querySelector('#file').addEventListener('change', this._loadFile.bind(this), false);
    this._ctx.canvas.addEventListener('click', () => this._fileInput.click(), false);
    const w = 1200;
    const h = 600;
    this._ctx.canvas.width = w;
    this._ctx.canvas.height = h;

    wrapListener(this.shadowRoot.querySelector('#create'), this.create.bind(this));

    this._ctx.font = '128px Everett';
    this._ctx.fillStyle = 'rgba(255,255,255,.5)';
    this._ctx.fillRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.width);
    this._ctx.fillStyle = 'rgba(0,0,0,.5)';
    this._ctx.fillText('+', (w / 2) - 54, (h / 2) + 54);
    setupTokenlistV2(this.shadowRoot);
  }

  _loadFile (evt) {
    const file = evt.target.files[0];
    const obj = URL.createObjectURL(file);
    const img = document.createElement('img');

    img.onload = () => {
      this._ctx.clearRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
      this._ctx.drawImage(img, 0, 0);
    };
    img.src = obj;
  }

  async bannerToBlob () {
    const originalFile = this._fileInput.files[0];
    if (!originalFile) {
      return;
    }

    const canvasBlob = await new Promise(
      (resolve) => {
        this._ctx.canvas.toBlob(resolve, 'image/webp')
    });

    return canvasBlob.size > originalFile.size ? originalFile : canvasBlob;
  }

  async create () {
    const obj = parseInput(this.shadowRoot.querySelector('#input'));
    if (obj.error) {
      return;
    }
    const token = await getTokenV2(obj.config.token);
    const meta = {
      title: obj.config.title,
      details: obj.config.details,
    };

    const bannerBlob = await this.bannerToBlob();
    if (bannerBlob) {
      const type = bannerBlob.type.replace('image/', '.');
      const fileName = 'banner' + type;
      const ret = await ipfsPush({ [fileName]: new Uint8Array(await bannerBlob.arrayBuffer()) });
      meta.bannerCid = ret[0].Hash;
    }
    const args = {
      governanceToken: token.address,
      metadata: encodeMetadata(meta)
    };
    await sendTransaction('CreateCommunity', args);
    this.remove();
  }
}
customElements.define('habitat-community-preview-creator', HabitatCommunityPreviewCreator);
