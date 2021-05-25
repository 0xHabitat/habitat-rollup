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
  getProposalInformation,
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

const ATTR_HASH = 'hash';

export default class HabitatProposal extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_HASH];
  }

  constructor() {
    super();
  }

  connectedCallback () {
    this.innerHTML = TEMPLATE;
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    return this.update();
  }

  async update () {
    const { habitat } = await getProviders();
    const txHash = this.getAttribute(ATTR_HASH);
    const {
      title,
      proposalId,
      startDate,
      vaultAddress,
      communityId,
      metadata,
      link,
      tx,
    } = await getProposalInformation(txHash);

    {
      // title / link elements
      const titleElement = this.querySelector('#title');
      titleElement.textContent = title;
      titleElement.href = link;
      this.querySelector('#open').href = link;
    }
    {
      const labels = metadata.labels || [];
      renderLabels(labels, this.querySelector('#labels'));
    }

    const { flavor } = await getModuleInformation(vaultAddress);
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
    votingElement.addEventListener('update', () => this.update(), { once: true });
    votingElement.setAttribute(ATTR_HASH, txHash);

    if (slider.value == slider.defaultValue) {
      slider.setRange(1, 100, 100, defaultSliderValue);
    }
  }
}

customElements.define('habitat-proposal', HabitatProposal);
