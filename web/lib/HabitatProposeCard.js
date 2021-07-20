import {
  wrapListener,
  renderAmount,
  ethers,
  secondsToString,
  getTokenV2,
} from './utils.js';
import {
  sendTransaction,
  getProviders,
  encodeExternalProposalActions,
  encodeInternalProposalActions,
  fetchVaultInformation,
  fetchIssue,
  renderLabels,
  encodeMetadata,
  resolveName,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';
import './HabitatToggle.js';
import './HabitatProposalActionBox.js';
import './HabitatProposalActionList.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.lbl {
  color: var(--color-grey);
  font-weight: ligther;
}
button, .button, button *, .button * {
  background-color: var(--color-bg-button);
  color: var(--color-button);
  border-color: var(--color-border-button);
}
:host(:not([proposal-type="Action"])) .proposal-action {
  display: none;
}
</style>
<div class='box'>
  <div class='flex row between'>
    <div>
      <label>
        <input id='url'>
        ⚠️ Please enter a GitHub link or <a target='_blank' href='https://github.com/0xHabitat/improvements-and-bugs/issues/new/choose'>create</a> an issue first.
      </label>
    </div>
    <div>
      <div class='flex row'>
        <habitat-toggle></habitat-toggle>
        <span id='modeLabel' style='margin-left:.5em;'> </span>
      </div>
    </div>
  </div>

  <div class='flex row'>
    <div class='flex col align-left'>
      <space></space>
      <p class='s lbl'>TITLE</p>
      <p class='bold l' style='display:block;max-width:40ch;height:2ch;text-overflow:ellipsis;' id='title'>Auto Filled</p>
      <space></space>
      <p class='s lbl'>INFO</p>
      <p class='m' id='body'>Auto Filled - Please enter a link</p>
      <space></space>
      <div id='labels' class='flex row'></div>
    </div>
  </div>

  <div class='flex col align-left proposal-action'>
  <p class='l bold'>Action</p>
    <habitat-proposal-action-list></habitat-proposal-action-list>
    <div class='flex col align-left'>
      <space></space>
      <habitat-proposal-action-box></habitat-proposal-action-box>
    </div>
  </div>

  <div class='flex col'>
    <button id='submit' style='place-self:flex-end;'>Submit</button>
  </div>
</div>
<div class='flex col'>
  <button id='boxleg'>&#10006; CLOSE</button>
</div>
`;

const ATTR_SIGNAL_VAULT = 'signal-vault';
const ATTR_ACTION_VAULT = 'action-vault';
const ATTR_PROPOSAL_TYPE = 'proposal-type';

export default class HabitatProposeCard extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_PROPOSAL_TYPE];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
    this.shadowRoot.querySelector('input#url').addEventListener('change', this.renderIssue.bind(this), false);
    wrapListener(this.shadowRoot.querySelector('#submit'), this.submit.bind(this));
    wrapListener(this.shadowRoot.querySelector('#boxleg'), () => this.remove());
    this.shadowRoot.querySelector('habitat-toggle').addEventListener('toggle', this.onToggle.bind(this), false);

    this.shadowRoot.querySelector('habitat-proposal-action-box').addEventListener(
      'action', this.shadowRoot.querySelector('habitat-proposal-action-list'), false
    );

    this.setAttribute(ATTR_PROPOSAL_TYPE, 'Signal');
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === ATTR_PROPOSAL_TYPE) {
      this.setMode(newValue);
      return;
    }
  }

  onToggle () {
    const actionMode = this.classList.toggle('actionMode');
    this.setAttribute(ATTR_PROPOSAL_TYPE, (actionMode ? 'Action' : 'Signal'));
  }

  setMode (str) {
    const actionMode = str.toLowerCase() === 'action';
    if (actionMode) {
      this.classList.add('actionMode');
      this.shadowRoot.querySelector('habitat-toggle').classList.add('on');
    } else {
      this.classList.remove('actionMode');
      this.shadowRoot.querySelector('habitat-toggle').classList.remove('on');
    }
    this.shadowRoot.querySelector('#modeLabel').textContent = actionMode ? 'Action' : 'Signal';
    this.shadowRoot.querySelector('habitat-proposal-action-box').setAttribute(
      'vault',
      this.getAttribute(actionMode ? ATTR_ACTION_VAULT : ATTR_SIGNAL_VAULT)
    );
  }

  async renderIssue (evt) {
    const url = evt.target.value;
    const issue = await fetchIssue(url);

    // cache
    this._githubIssue = issue;
    this.shadowRoot.querySelector('#title').textContent = issue.title;
    // xxx: consider using an iframe for embedding
    this.shadowRoot.querySelector('#body').innerHTML = issue.body_html;

    renderLabels(issue.labels, this.shadowRoot.querySelector('#labels'));
  }

  async submit (evt) {
    const { habitat, rootProvider } = await getProviders();
    const inputs = this.shadowRoot.querySelectorAll('button input textarea');
    const src = this.shadowRoot.querySelector('input#url').value;
    const labels = [];
    let title = '';
    let details = '';

    {
      const titleSrc = this.shadowRoot.querySelector('input#title');
      if (titleSrc) {
        title = titleSrc.value;
      }
      const textarea = this.shadowRoot.querySelector('textarea');
      if (textarea) {
        details = textarea.value;
      }
    }
    // github
    if (this._githubIssue) {
      const titleSrc = this.shadowRoot.querySelector('#title');
      if (titleSrc) {
        title = titleSrc.textContent;
      }

      details = this._githubIssue.body_html;

      for (const label of this._githubIssue.labels) {
        labels.push({ name: label.name, color: label.color });
      }
    }

    for (const ele of inputs) {
      ele.disabled = true;
    }

    try {
      const topic = this.getAttribute('topic');
      const vaultAddress = this.getAttribute(this.classList.contains('actionMode') ? ATTR_ACTION_VAULT : ATTR_SIGNAL_VAULT);
      const { internalActions, externalActions } = await this.shadowRoot.querySelector('habitat-proposal-action-list').encode();
      const args = {
        startDate: ~~(Date.now() / 1000),
        vault: vaultAddress,
        externalActions,
        internalActions,
        metadata: encodeMetadata({ title, details, src, labels, topic })
      };
      console.log({args});
      const receipt = await sendTransaction('CreateProposal', args);
      this.remove();
    } finally {
      for (const ele of inputs) {
        ele.disabled = false;
      }
    }
  }
}
customElements.define('habitat-propose-card', HabitatProposeCard);
