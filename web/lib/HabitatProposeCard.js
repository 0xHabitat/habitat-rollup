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
  fetchIssue,
  renderLabels,
  encodeMetadata,
  resolveName,
  getIssueLinkForVault,
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

:host {
  transform: translateZ(0);
}

input, textarea {
  color: var(--color-text);
  border-radius: 1em;
  border: 1px solid var(--color-accent-grey);
  background-color: var(--color-bg);
}

input::placeholder, textarea::placeholder {
  color: var(--color-grey);
}

textarea {
  min-height: 8ch;
}

a {
  line-height: 1;
}
</style>
<div class='box'>
  <div class='flex row between'>
    <div>
      <label>
        <input id='url' placeholder='Discussion link (optional)'>
        <span style='vertical-align:top;'>ℹ</span>
        <span>You can also </span>
        <a id='issueLink' target='_blank' style='text-decoration:underline;' href=''>create a GitHub issue</a>
        <span> and embed it here.</span>
      </label>
    </div>
    <div>
      <div class='flex row'>
        <habitat-toggle
          left='Signal'
          right='Action'
          tooltip-left='Continues voting that allows to show interest in a solution or idea.'
          tooltip-right='"Yes or No" simple majority vote with a 7 day voting period and 10% quorum. Proposal can have executable actions for mainnet or rollup.'
        ></habitat-toggle>
      </div>
    </div>
  </div>

  <div class='flex row'>
    <div class='flex col align-left' style='max-width:100%'>
      <space></space>
      <p class='s lbl'>TITLE</p>
      <input class='bold l' style='display:block;width:40ch;max-width:100%;height:2ch;text-overflow:ellipsis;' id='title' placeholder='Topic Title'>
      <space></space>
      <p class='s lbl'>INFO</p>
      <textarea class='m' id='body' placeholder='Description'></textarea>
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

  async setMode (str) {
    const actionMode = str.toLowerCase() === 'action';
    const toggle = this.shadowRoot.querySelector('habitat-toggle');
    if (actionMode) {
      this.classList.add('actionMode');
      toggle.setAttribute('on', '1');
    } else {
      this.classList.remove('actionMode');
      toggle.setAttribute('on', '0');
    }
    const vault = this.getAttribute(actionMode ? ATTR_ACTION_VAULT : ATTR_SIGNAL_VAULT);
    this.shadowRoot.querySelector('habitat-proposal-action-box').setAttribute(
      'vault',
      vault
    );
    this.shadowRoot.querySelector('#issueLink').href = await getIssueLinkForVault(vault);

    toggle.style.display = this.getAttribute(ATTR_ACTION_VAULT) === this.getAttribute(ATTR_SIGNAL_VAULT) ? 'none' : 'block';
  }

  async renderIssue (evt) {
    const inputs = this.shadowRoot.querySelectorAll('#title, #body');
    const url = evt.target.value;
    if (!url) {
      for (const node of inputs) {
        node.disabled = false;
      }
      return;
    }

    const issue = await fetchIssue(url);

    if (!issue.labels) {
      return;
    }

    // cache
    this._githubIssue = issue;
    this.shadowRoot.querySelector('#title').value = issue.title;
    this.shadowRoot.querySelector('#body').value = issue.body_text;

    for (const node of inputs) {
      node.disabled = true;
    }

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
      const titleSrc = this.shadowRoot.querySelector('#title');
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
