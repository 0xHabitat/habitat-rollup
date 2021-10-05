import {
  wrapListener,
  parseInput,
} from './utils.js';
import {
  encodeMetadata,
  sendTransaction,
  doQueryWithOptions,
  decodeMetadata,
} from './rollup.js';

import { COMMON_STYLESHEET } from './component.js';
import HabitatVotingModulePreview from './HabitatVotingModulePreview.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.box input {
  border: 1px solid var(--color-accent-grey);
  border-radius: 1rem;
  padding: .5rem;
  margin: .5rem 0;
}
#modules {
  display: grid;
  gap: 1rem;
  grid-template-columns: 10ch auto;
  width: 100%;
}
#subButtons {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, 16ch);
  width: 100%;
}
#categories > p {
  font-weight: lighter;
  font-size: .8em;
}
#votingModules {
  perspective: none;
  transform: translateZ(0);
}
#votingModules > div {
  width: 100%;
  height: 0;
  -moz-backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform-style: flat;
  transform: scale(0) translateZ(0);
  transition: transform .1s ease-out;
}
#votingModules > div.selected {
  height: auto;
  transform: none;
  transition: transform .2s ease-in;
}
#votingModules > div {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18em, 1fr));
  gap: 8px;
  width: 100%;
  place-content: center space-evenly;
}
#categories > p {
  cursor: pointer;
}
#categories > p.selected {
  text-decoration: underline;
}
habitat-voting-module-preview {
  padding: 3px;
  cursor: pointer;
  border-radius: 2em;
  display: flex;
  flex-direction: column;
}
.choice {
  background: linear-gradient(180deg, #49C19E 0%, #66D9A5 29.17%, #4EF6C1 63.02%, #4CE28D 100%);
}
.choice::before {
  content: '✓';
  position: absolute;
  width: 1em;
  height: 1em;
  top: -.5em;
  line-height: 1;
  color: white;
  background-color: black;
  border-radius: 50%;
  padding: .5em;
  align-self: flex-end;
}
</style>
<div class='box'>
  <p class='l'><span><emoji-seedling></emoji-seedling></span><span> Create a Treasury</span></p>
  <space></space>
  <div class='flex col align-left'>
    <input id='title' placeholder='Name of Treasury'>
    <input id='details' placeholder='Short Description'>
    <space></space>
    <input id='link' placeholder='Link to GitHub Repository for Proposals'>
  </div>

  <space></space>
  <p><span><emoji-ballot-box-with-ballot></emoji-ballot-box-with-ballot></span><span> Voting Module</span></p>
  <space></space>

  <div class='flex col box'>
  <div id='modules'>
      <div class='flex col'>
        <p>Category</p>
        <sep></sep>
        <div id='categories'></div>
      </div>

      <div id='votingModules'></div>
    </div>

    <space></space>
    <div id='subButtons' class='flex row smaller align-left'>
      <a class='button' target='_blank' href='https://github.com/0xHabitat/improvements-and-bugs/issues/new/choose'>Suggest Module</a>
      <a class='button' href='#habitat-tools'>Submit Module</a>
    </div>
  </div>

  <space></space>
  <div class='flex row between'>
    <span> </span>
    <button id='create'>Create</button>
  </div>
</div>
 <div class='flex col'>
  <button id='boxleg'>&#10006; CLOSE</button>
</div>
`;

export default class HabitatTreasuryCreator extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
    wrapListener(this.shadowRoot.querySelector('#create'), this.create.bind(this));
    wrapListener(this.shadowRoot.querySelector('#boxleg'), () => this.remove());

    this._init();
  }

  async _init () {
    const FLAVOR_TYPES = ['binary', 'signal'];
    const FLAVOR_NAMES = {
      'signal': 'Signaling',
      'binary': 'Hard Governance',
      'other': 'Other',
    };
    const SELECTED = 'selected';
    const CHOICE = 'choice';

    const cats = this.shadowRoot.querySelector('#categories');
    const modContainer = this.shadowRoot.querySelector('#votingModules');
    let firstCategory;

    for (const log of await doQueryWithOptions({ toBlock: 1 }, 'ModuleRegistered')) {
      try {
        const { contractAddress, metadata } = log.args;
        const meta = decodeMetadata(metadata);

        if (!meta.version || FLAVOR_TYPES.indexOf(meta.flavor) === -1) {
          console.warn('invalid module metadata', meta, tx);
          continue;
        }

        const category = meta.flavor || 'other';
        const preview = new HabitatVotingModulePreview();
        preview.setAttribute('condition', contractAddress);
        preview.addEventListener('click', () => {
          const prev = modContainer.querySelector('.choice');
          if (prev) {
            prev.classList.remove(CHOICE);
          }
          preview.classList.add(CHOICE);
        }, false);

        const previewContainer = modContainer.querySelector(`[category="${category}"]`);
        if (previewContainer) {
          previewContainer.append(preview);
        } else {
          // create a category

          const link = document.createElement('p');
          link.textContent = FLAVOR_NAMES[meta.flavor] || 'Other';
          cats.append(link);
          if (!firstCategory) {
            firstCategory = link;
          }

          const container = document.createElement('div');
          container.setAttribute('category', category);
          container.append(preview);
          modContainer.append(container);

          link.addEventListener('click', () => {
            for (const node of cats.children) {
              node.classList.remove(SELECTED);
            }
            link.classList.add(SELECTED);

            for (const node of modContainer.children) {
              node.classList.remove(SELECTED);
            }
            container.classList.add(SELECTED);
          }, false);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (firstCategory) {
      firstCategory.click();
    }
  }

  async create () {
    const input = parseInput(this.shadowRoot);
    if (input.error) {
      return;
    }
    const meta = input.config;
    const args = {
      communityId: this.getAttribute('communityId'),
      condition: this.shadowRoot.querySelector('#votingModules .choice').getAttribute('condition'),
      metadata: encodeMetadata(meta)
    };
    console.log(meta, args);
    await sendTransaction('CreateVault', args);
    this.remove();
  }
}
customElements.define('habitat-treasury-creator', HabitatTreasuryCreator);
