import {
  setupTokenlist,
  wrapListener,
  getToken
} from './utils.js';
import {
  encodeMetadata,
  sendTransaction
} from './rollup.js';
import { ipfsPush } from './ipfs.js';

const TEMPLATE =
`
<style>
.communityBox {
  border-radius: 2em;
  background-color: var(--color-accent-grey);
  cursor: pointer;
}
.communityBox canvas {
  width: 40ch;
  height: 20ch;
  border-radius: 2em;
}
.communityBox input {
  border: none;
  border-bottom: 1px solid var(--color-bg-invert);
}
</style>
<div class='communityBox'>
  <space></space>
  <div class='flex col'>
    <input id='title' placeholder='Name of Community'>
    <input id='token' placeholder='Governance Token' list='tokenlist'>
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
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;

      this._ctx = this.querySelector('canvas').getContext('2d');
      this._fileInput = this.querySelector('#file');
      this.querySelector('#file').addEventListener('change', this._loadFile.bind(this), false);
      this._ctx.canvas.addEventListener('click', () => this._fileInput.click(), false);
      const w = 1200;
      const h = 600;
      this._ctx.canvas.width = w;
      this._ctx.canvas.height = h;

      wrapListener(this.querySelector('#create'), this.create.bind(this));

      this._ctx.font = '128px Everett';
      this._ctx.fillStyle = 'rgba(255,255,255,.5)';
      this._ctx.fillRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.width);
      this._ctx.fillStyle = 'rgba(0,0,0,.5)';
      this._ctx.fillText('+', (w / 2) - 54, (h / 2) + 54);
      setupTokenlist();
    }
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
    const token = await getToken(this.querySelector('#token').value);
    const title = this.querySelector('#title').value;
    const meta = {
      title
    };
    const bannerBlob = await this.bannerToBlob();
    globalThis.foo = bannerBlob;
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
