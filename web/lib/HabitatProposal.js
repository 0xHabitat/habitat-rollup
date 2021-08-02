 import {
  wrapListener,
  getEtherscanLink,
  getEtherscanTokenLink,
  secondsToString,
  renderAmount,
  walletIsConnected,
  getTokenV2,
  ethers,
  sanitize,
} from '/lib/utils.js';
import {
  getProviders,
  sendTransaction,
  decodeExternalProposalActions,
  decodeInternalProposalActions,
  executeProposalActions,
  formatObject,
  humanProposalTime,
  getUsername,
  fetchProposalStats,
  VotingStatus,
  simulateProcessProposal,
  fetchIssue,
  renderLabels,
  getTransactionHashForVaultAddress,
  decodeMetadata
} from '/lib/rollup.js';
  import HabitatPanel from '/lib/HabitatPanel.js';

const CIRCLES = `
<habitat-circle class='signal' id='participation' tag='Participation'></habitat-circle>
<habitat-circle id='votes' tag='Votes'></habitat-circle>
<habitat-circle class='signal' id='shares' tag='Shares'></habitat-circle>
`;

let communityId, proposalId, proposer, tx, txHash;

class HabitatProposal extends HabitatPanel {
  static TEMPLATE =
  `
<style>
p.details {
  top: 10em;
  padding: 1rem;
  background-color: white;
  border-radius: 6px;
  border: 2px solid var( --color-bg);
}

.proposal {
  margin: 1rem;
  padding: 2rem;
  background-color: var(--color-bg);
  border-radius: 9px;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
}

habitat-slider {
  background: var(--gradient-coldhot);
}
</style>
<section id='container' class='flex col center padv'>
  <h1 id='title'> </h1>
  <div id='labels' class='flex row'></div>
  <div class='proposal'>
    <p id='proposal'> </p>
    <space></space>
    <sep></sep>
    <div id='proposalStats'></div>
  </div>
  <section id='circles' class='flex row center evenly padv'></section>

  <section class='highlight'>
    <h3>Proposal Actions</h3>
    <sep></sep>
    <div class='flex col center' style='width:120ch; max-width:100%;'>
      <div class='grid-col align-left proposalActions' style='grid-template-columns: repeat(3, auto);'>
      </div>
    </div>
  </section>

  <habitat-voting-sub></habitat-voting-sub>

  <div class='flex actions'>
    <button id='finalize' disabled>Finalize Proposal</button>
    <button id='execProposal' disabled>Execute On-chain Proposal actions</button>
  </div>
  <a id='visitVault' class='button secondary smaller purple' href=''>Treasury Overview</a>
</section>
`;

  constructor() {
    super();
  }

  async processProposal (proposalId, originTx) {
    const args = {
      proposalId,
      internalActions: originTx.message.internalActions,
      externalActions: originTx.message.externalActions,
    };

    await sendTransaction('ProcessProposal', args);
    await this.updateProposal();
  }

  async executeProposal (vaultAddress, proposalId, actionBytes) {
    const tx = await executeProposalActions(vaultAddress, proposalId, actionBytes);
    // lazy :)
    window.open(getEtherscanLink(tx.hash), '_blank');
  }

  async updateProposal () {
    const { habitat } = await getProviders();
    const {
      totalShares,
      defaultSliderValue,
      signals,
      signalStrength,
      userShares,
      userSignal,
      totalVotes,
      participationRate,
      tokenSymbol,
      proposalStatus,
    } = await fetchProposalStats({ communityId, proposalId });
    const votingDisabled = proposalStatus > VotingStatus.OPEN;
    const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(tx.message.startDate);
    const { internalActions, externalActions } = tx.message;
    const { votingStatus, secondsTillClose, quorumPercent } = await simulateProcessProposal({ proposalId, internalActions, externalActions });
    const tillClose = secondsTillClose === -1 ? '∞' : secondsToString(secondsTillClose);

    this.shadowRoot.querySelector('#finalize').disabled = !(votingStatus > VotingStatus.OPEN);
    this.shadowRoot.querySelector('#execProposal').disabled = !(proposalStatus === VotingStatus.PASSED && tx.message.externalActions !== '0x');

    // some metadata below the proposal
    {
      const obj = {
        id: proposalId,
        status,
        proposer,
        'Closes in': tillClose,
        'Quorum Threshold reached by': `${quorumPercent}%`,
      };

      const container = this.shadowRoot.querySelector('#proposalStats');
      const ele = formatObject(obj);
      ele.className = 'grid-2';
      container.innerHTML = '';
      container.appendChild(ele);
    }

    // statistics
    {
      const circles = this.shadowRoot.querySelector('#circles');
      circles.innerHTML = CIRCLES;
      circles.querySelector('#participation').setValue(participationRate, `${participationRate.toFixed(1)}%`);
      circles.querySelector('#votes').setValue(100, totalVotes, totalVotes !== 1 ? 'Votes' : 'Vote');
      circles.querySelector('#shares').setValue(signalStrength, renderAmount(totalShares, 0, 1), totalShares !== 1 ? 'Shares' : 'Share');
    }
  }

  get title () {
    return this.shadowRoot.querySelector('h1#title').textContent;
  }

  async chainUpdateCallback () {
    await this.updateProposal();
  }

  async render () {
    const { habitat } = await getProviders();
    const args = this.getAttribute('args').split(',');
    txHash = args[1];

    tx = await habitat.provider.send('eth_getTransactionByHash', [txHash]);
    const receipt = await habitat.provider.send('eth_getTransactionReceipt', [txHash]);
    const proposalEvent = habitat.interface.parseLog(receipt.logs[0]);
    proposer = await getUsername(receipt.from);
    console.log({tx,receipt});
    let metadata = {};
    try {
      metadata = decodeMetadata(tx.message.metadata);
    } catch (e) {
      console.warn(e);
    }

    communityId = await habitat.callStatic.communityOfVault(tx.message.vault);
    proposalId = proposalEvent.args.proposalId;

    this.shadowRoot.querySelector('#visitVault').href = `#habitat-vault,${await getTransactionHashForVaultAddress(tx.message.vault)}`;
    {
      renderLabels(metadata.labels || [], this.shadowRoot.querySelector('#labels'));

      const titleElement = this.shadowRoot.querySelector('h1#title');
      const bodyElement = this.shadowRoot.querySelector('#proposal');

      titleElement.textContent = metadata.title || '<no title>';
      // proposal body
      if (metadata.src) {
        try {
          const issue = await fetchIssue(metadata.src);
          const article = document.createElement('article');
          article.attachShadow({ mode: 'open' }).append(sanitize(issue.body_html));
          bodyElement.replaceChildren(article);
          // update title
          titleElement.textContent = issue.title;

          // add link to issue
          const link = document.createElement('a');
          link.target = '_blank';
          link.href = metadata.src;
          link.className = 'button secondary purple smaller';
          link.textContent = metadata.src;
          this.shadowRoot.querySelector('#container').insertBefore(link, bodyElement.parentElement);
        } catch (e) {
          console.warn(e);
        }
      } else {
        const details = metadata.details || '<no information>';
        bodyElement.textContent = details;
      }
      this.setTitle(titleElement.textContent);
    }

    const internalActions = decodeInternalProposalActions(tx.message.internalActions);
    const externalActions = decodeExternalProposalActions(tx.message.externalActions);
    {
      const grid = this.shadowRoot.querySelector('.proposalActions');
      grid.innerHTML = '<p></p><a target="_blank"></a><p></p>'.repeat(internalActions.length + externalActions.length);
      const childs = grid.children;
      let childPtr = 0;

      for (let i = 0, len = externalActions.length; i < len;) {
        const contractAddress = externalActions[i++];
        const calldata = externalActions[i++];

        // type
        childs[childPtr++].textContent = 'On-chain Contract call';
        // address
        childs[childPtr].textContent = contractAddress;
        childs[childPtr++].href = getEtherscanLink(contractAddress);
        // calldata
        childs[childPtr++].textContent = calldata;
      }

      for (let i = 0, len = internalActions.length; i < len;) {
        const action = internalActions[i++];
        // type
        childs[childPtr++].textContent = action.type;
        // xxx check if token is nft
        const erc = await getTokenV2(action.token);
        childs[childPtr].href = getEtherscanTokenLink(erc.address);
        childs[childPtr++].textContent = `${renderAmount(action.value, erc.decimals)} ${erc.symbol}`;
        childs[childPtr++].textContent = action.receiver;
      }
    }

    {
      wrapListener(this.shadowRoot.querySelector('habitat-voting-sub'), async () => {
        await this.updateProposal();
      }, 'update');
      wrapListener(this.shadowRoot.querySelector('button#finalize'), () => this.processProposal(proposalId, tx));

      // any actions we can execute?
      // TODO: calculate estimate of bridge finalization time
      if (externalActions.length) {
        wrapListener(
          this.shadowRoot.querySelector('button#execProposal'),
          () => this.executeProposal(tx.message.vault, proposalId, tx.message.externalActions)
        );
      }
    }

    this.shadowRoot.querySelector('habitat-voting-sub').setAttribute('hash', txHash);
    await this.updateProposal();
  }
}
customElements.define('habitat-proposal', HabitatProposal);
