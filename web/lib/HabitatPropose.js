import {
  sendTransaction,
  getProviders,
  encodeExternalProposalActions,
  encodeInternalProposalActions,
  fetchVaultInformation,
  fetchIssue,
  renderLabels,
  encodeMetadata,
} from '/lib/rollup.js';
import {
  wrapListener,
  getSigner,
  ethers,
} from '/lib/utils.js';
import {
  AddExecutionFlow,
  AddTransferFlow,
} from '/lib/flows.js';
import HabitatPanel from '/lib/HabitatPanel.js';

let vaultAddress, githubIssue;
const externalActions = [];
const internalActions = [];

class HabitatPropose extends HabitatPanel {
  static TEMPLATE =
`
<style>
</style>
<section class='bgwhite padh padv flex col center'>
  <div style='width:80ch;max-width:100%;min-height:100vh;'>
    <h1>Create a Proposal</h1>
    <h6 class='left' id='vaultName'> </h6>
    <space></space>
    <section id='propose'>
      <div id='labels' class='flex row'></div>
      <label>
        GitHub Issue Link
        <input type='text' id='url'></input>
      </label>
      <label>
        Title of this Proposal
        <!--
          <input type='text' id='title'></input>
        -->
        <h1 id='title'> </h1>
        <sep></sep>
      </label>
      <label>
        The body of your proposal
        <!--
          <textarea placeholder='Your proposal goes here...'></textarea>
        -->
        <div id='body'></div>
      </label>
      <space></space>

      <section class='left'>
        <h3>Optional Actions</h3>
        <sep></sep>
        <div>
          <div id='proposalActions' class='grid-col align-left' style='grid-template-columns:repeat(3, auto)'>
          </div>
        </div>
        <div>
          <space></space>
          <button id='transfer' class='flow'>Add Token Transfer</button>
          <button id='execution' class='flow'>Add On-chain execution</button>
        </div>
      </section>

      <div id='actions' class='left'>
        <h1>Looks good?</h1>
        <button id='submit'>Submit</button>
      </div>
      <space></space>
    </section>
  </div>
</section>
`;

  constructor() {
    super();
  }

  async doSubmit (evt) {
    const { habitat, rootProvider } = await getProviders();
    const container = this.shadowRoot.querySelector('#propose');
    const actions = this.shadowRoot.querySelector('.actions');
    const inputs = this.shadowRoot.querySelectorAll('button input textarea');
    const src = this.shadowRoot.querySelector('input#url').value;
    const labels = [];
    let title = '';
    let details = '';

    {
      const titleSrc = container.querySelector('input#title');
      if (titleSrc) {
        title = titleSrc.value;
      }
      const textarea = container.querySelector('textarea');
      if (textarea) {
        details = textarea.value;
      }
    }
    // github
    if (githubIssue) {
      const titleSrc = container.querySelector('h1#title');
      if (titleSrc) {
        title = titleSrc.textContent;
      }

      for (const label of githubIssue.labels) {
        labels.push({ name: label.name, color: label.color });
      }
    }

    for (const ele of inputs) {
      ele.disabled = true;
    }

    try {
      const args = {
        // xxx query contract
        startDate: ~~(Date.now() / 1000),
        vault: vaultAddress,
        externalActions: encodeExternalProposalActions(externalActions),
        internalActions: encodeInternalProposalActions(internalActions),
        metadata: encodeMetadata({ title, details, src, labels })
      };
      const receipt = await sendTransaction('CreateProposal', args);
      window.location.hash = `habitat-proposal,${receipt.transactionHash}`;
    } finally {
      for (const ele of inputs) {
        ele.disabled = false;
      }
    }
  }

  async renderIssue (evt) {
    const url = evt.target.value;
    const issue = await fetchIssue(url);

    // cache
    githubIssue = issue;
    this.shadowRoot.querySelector('h1#title').textContent = issue.title;
    this.setTitle(issue.title);
    // xxx: consider using an iframe for embedding
    this.shadowRoot.querySelector('#body').innerHTML = issue.body_html;
    renderLabels(issue.labels, this.shadowRoot.querySelector('#labels'));
  }

  async render () {
    async function addAction (obj) {
      const grid = this.shadowRoot.querySelector('#proposalActions');
      let args = [];

      if (obj.contractAddress) {
        // on-chain execution
        args = [
          'On-chain Execution',
          obj.contractAddress,
          obj.calldata
        ];
        externalActions.push(obj.contractAddress);
        externalActions.push(obj.calldata);
      }

      if (obj.erc20) {
        args = [
          'Token Transfer',
          obj.receiver,
          `${obj.amount} ${obj.erc20.symbol}`
        ];
        internalActions.push('0x1');
        internalActions.push(obj.erc20.address);
        internalActions.push(obj.receiver);
        internalActions.push(ethers.utils.parseUnits(obj.amount, obj.erc20.decimals).toHexString());
      }

      for (const arg of args) {
        const p = document.createElement('p');
        p.textContent = arg;
        grid.appendChild(p);
      }
    }

    wrapListener(this.shadowRoot.querySelector('input#url'), this.renderIssue.bind(this), 'change');
    wrapListener(this.shadowRoot.querySelector('button#submit'), this.doSubmit.bind(this));
    wrapListener(this.shadowRoot.querySelector('button#execution'), (evt) => new AddExecutionFlow(evt.target, { callback: addAction.bind(this) }));
    wrapListener(this.shadowRoot.querySelector('button#transfer'), (evt) => new AddTransferFlow(evt.target, { callback: addAction.bind(this) }));

    const [, txHash] = this.getAttribute('args').replace('#', '').split(',');
    const vaultInfo = await fetchVaultInformation(txHash);
    const title =  `For Treasury: ${vaultInfo.metadata.title}`;
    this.shadowRoot.querySelector('#vaultName').textContent = title;
    this.setTitle(`Proposal ${title}`);
    vaultAddress = vaultInfo.vaultAddress;
  }
}
customElements.define('habitat-propose', HabitatPropose);
