import {
  wrapListener,
  renderAmount,
  ethers,
  secondsToString,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  submitVote,
  VotingStatus,
  humanProposalTime,
  renderLabels,
  getModuleInformation,
  simulateProcessProposal,
} from './rollup.js';
import './HabitatCircle.js';
import './HabitatVotingSub.js';

const TEMPLATE =
`
<div class='listitem'>
  <div style='height:2.5rem;overflow:hidden;'>
    <a style='font-size:1.2rem;' class='bold' target='_blank' id='title'></a>
  </div>
  <div id='labels' class='flex row'></div>
  <sep></sep>
  <center style='padding-bottom:1rem;'>
    <habitat-circle class='signal'></habitat-circle>
    <p id='totalVotes' class='text-center smaller bold' style='padding:.3rem;'></p>
    <p id='time' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
    <p id='tillClose' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
    <p id='quorum' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
  </center>

  <habitat-voting-sub></habitat-voting-sub>

  <div class='flex col'>
    <a target='_blank' id='open' class='button smaller purple'>View Proposal</a>
    <space></space>
    <p class='bold smaller'>You can replace your vote any time.</p>
  </div>
</div>
`;

export default class HabitatProposal extends HTMLElement {
  constructor() {
    super();
  }

  init () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
    }
  }

  connectedCallback () {
    this.init();
  }

  async update (proposalCreatedEvent) {
    this.init();

    const { habitat } = await getProviders();
    const txHash = proposalCreatedEvent.transactionHash;
    const tx = await habitat.provider.send('eth_getTransactionByHash', [txHash]);
    const { proposalId, startDate, vault } = proposalCreatedEvent.args;
    let metadata = {};
    let title = '???';
    try {
      metadata = JSON.parse(proposalCreatedEvent.args.metadata);
      title = metadata.title || title;
    } catch (e) {
      console.error(e);
    }

    {
      // title / link elements
      const base = window.location.pathname.split('/')[1];
      const proposalLink = `/${base}/proposal/#${proposalCreatedEvent.transactionHash}`;
      const titleElement = this.querySelector('#title');
      titleElement.textContent = title;
      titleElement.href = proposalLink;
      this.querySelector('#open').href = proposalLink;
    }
    {
      const labels = metadata.labels || [];
      renderLabels(labels, this.querySelector('#labels'));
    }

    const communityId = await habitat.communityOfVault(vault);
    const { flavor } = await getModuleInformation(vault);
    const slider = this.querySelector('habitat-slider');

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
      userBalance,
    } = await fetchProposalStats({ communityId, proposalId });
    const simResult = await simulateProcessProposal(
      {
        proposalId,
        internalActions: tx.message.internalActions,
        externalActions: tx.message.externalActions,
      }
    );
    const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);
    const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(startDate);
    const tillClose = simResult.secondsTillClose === -1 ? '∞' : secondsToString(simResult.secondsTillClose);

    this.querySelector('#tillClose').textContent = `Closes in ${tillClose}`;
    this.querySelector('#time').textContent = status;
    this.querySelector('#quorum').textContent = `Quorum Threshold is ${simResult.quorumPercent}% reached`;
    this.querySelector('habitat-circle').setValue(signalStrength, renderAmount(totalShares), tokenSymbol);

    const votingElement = this.querySelector('habitat-voting-sub');
    votingElement.addEventListener('update', () => this.update(proposalCreatedEvent), { once: true });
    votingElement.update({ proposalId, vault });

    if (slider.value == slider.defaultValue) {
      slider.setRange(1, 100, 100, defaultSliderValue);
    }
  }
}

customElements.define('habitat-proposal', HabitatProposal);
