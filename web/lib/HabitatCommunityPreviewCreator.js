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
:host {
  width:100%;
}
button, .button, button *, .button * {
  background-color: var(--color-bg-button);
}
#create-community-box {
  border-radius: 2em;
  background-color: var(--color-box);
  border: 1px solid var(--color-bg-invert);
  width:100%;
  margin:5em 0 0 0;
  padding:3em;
}
canvas {
  margin: .5em 0;
  width: 100%;
  min-width:20ch;
  border: 1px solid var(--color-bg-invert);
  border-radius: 2em;
  cursor: pointer;
}
canvas.editor {
  cursor: all-scroll;
}
#create-community-box input, textarea {
  margin: .5em 0;
  color: var(--color-text);
  border-radius: 2em;
  border: 1px solid var(--color-accent-grey);
  background-color: var(--color-bg);
  min-width:14ch;
  width:100%;
  font-weight: 300;
}
#input {
  width:100%; 
  flex:1 0 0;
}
#title {
  width:100%;
  height:1em;
  justify-content:center;
}
#details {
  width:100%;
  resize:vertical;
  min-height:8ch;
}
#token {
  height:1em;
}
input::placeholder, textarea::placeholder {
  color: var(--color-grey);
}
#create-token {
  cursor:pointer;
  white-space:nowrap;
  padding:.5em;
  text-decoration:underline;
  font-weight:500;
}
habitat-verc-creator {
  width:100%;
  display:none;
}
habitat-verc-creator.active {
  display:block;
}
button#create {
  place-self:flex-end;
  padding:.5em 2em;
}
</style>
<div id='create-community-box'>
  <div class='left' style='margin-bottom: 2em;'>
    <p class='l'><span><emoji-seedling></emoji-seedling><span> Create a Community</span></span></p>
  </div>

  <div class='flex row between' style='align-items:flex-start;flex-wrap:wrap;gap:3em;'>
    <div id='input' class='flex col center evenly'>
      <input id='title' placeholder='Name of Community'>
      <textarea id='details' placeholder='Info About Community'></textarea>
      <div class='flex row between' style='width:100%;flex-wrap:nowrap;gap:1em;'>
        <input id='token' placeholder='Governance Token' list='tokenlistv2'>
        <a id='create-token' class='right s'>Create Token</a>
      </div>
      <habitat-verc-creator></habitat-verc-creator>
    </div>
    <div class='flex col center' style='min-width:25ch; flex: 1 0 0;'>
        <div style=''>
          <input style='display:none;' id='file' type='file' accept='image/*'>
          <canvas></canvas>
          <label class='smaller' style='font-weight:300;margin-top:0;'>
            Aspect ratio is 2:1. i.e 1200x600
          </label>
        </div>
    </div>
  </div>

  <div class='flex col align-right'>
    <button id='create'>Create</button>
  </div>
</div>
<div class='flex col'>
  <button id='boxleg'>&#10006; CLOSE</button>
</div>
`;

//issue: images being uploaded with added whitespace to fill height/width requirements?
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
    wrapListener(this.shadowRoot.querySelector('#boxleg'), () => {
      this.remove();
    });

    this._ctx.font = '128px Everett';
    this._ctx.fillStyle = 'rgba(255,255,255,.5)';
    this._ctx.fillRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.width);
    this._ctx.fillStyle = 'rgba(0,0,0,.5)';
    this._ctx.fillText('+', (w / 2) - 54, (h / 2) + 54);
    setupTokenlistV2(this.shadowRoot);

    this.createToken = this.shadowRoot.querySelector('#create-token');
    this.vERCCreator = this.shadowRoot.querySelector('habitat-verc-creator');

    const vERCToggle = () => {
      this.vERCCreator.classList.toggle('active');
    }
    this.createToken.addEventListener('click', vERCToggle);

    const celebration = this.vERCCreator.innerHTML
    console.log(celebration)
  }

  _loadFile (evt) {
    const file = evt.target.files[0];
    console.log('file: ' + file)
    const obj = URL.createObjectURL(file);
    const img = document.createElement('img');

    img.onload = () => {
      //fit image
      const scale = Math.max(this._ctx.canvas.width / img.width, this._ctx.canvas.height / img.height);
      const x = (img.width * scale) + (this._ctx.canvas.width * scale) / this._ctx.canvas.width;
      const y = (img.height * scale) + (this._ctx.canvas.height * scale) / this._ctx.canvas.height;

      this._ctx.clearRect(0, 0, this._ctx.canvas.width, this._ctx.canvas.height);
      this._ctx.drawImage(img, 0,0, img.width, img.height, 0, 0, x, y);
      this._ctx.canvas.classList.toggle('editor');
      console.log('image loaded')
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
