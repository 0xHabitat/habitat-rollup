import {
  wrapListener,
  renderAmount,
  ethers,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  submitVote,
  VotingStatus,
  humanProposalTime,
  renderLabels,
  getModuleInformation,
} from './rollup.js';
import HabitatCircle from '/lib/HabitatCircle.js';

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
    <p id='feedback' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
    <p id='time' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
  </center>

  <label>
    The amount to stake
    <input style='min-width:100%;margin:auto;' class='smaller' id='shares' type='number' value='1'>
  </label>
  <div id='binary' class='flex row center' style='display:none;width:20ch;'>
    <label>
    A binary vote stakes your amount above on either Yes or No.
    <div class='flex row center'>
    <button id='vote' class='bold yes green' disabled>Yes</button>
    <button id='vote' class='bold no red' disabled>No</button>
    </div>
    </label>
  </div>
  <div id='signal' class='flex row center' style='display:none;width:30ch;'>
    <div style="width:100%;height:1.4rem;font-size:.7rem;">
      <h3 class="left inline" style="float:left;text-shadow:0 0 2px #909090;">❄️</h3>
      <h3 class="right inline" style="float:right;text-shadow:0 0 2px #909090;">🔥</h3>
    </div>
    <habitat-slider></habitat-slider>
    <label>
    A signaling vote stakes your amount above and your signaled importance on this proposal.
    <button id='vote' class='bold signal' disabled>Vote</button>
    </label>
  </div>

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

    const { habitat } = await getProviders();
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
    const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);
    const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(startDate);
    const inputShares = document.querySelector('#shares');

    for (const ele of this.querySelectorAll('button#vote')) {
      ele.disabled = votingDisabled;
      wrapListener(
        ele,
        async (evt) => {
          let signalStrength = 0;
          const shares = inputShares.value;

          if (flavor === 'binary') {
            signalStrength = evt.target.classList.contains('yes') ? 100 : 1;
          } else if (flavor === 'signal') {
            signalStrength = Number(slider.value);
          }

          await submitVote(communityId, proposalId, signalStrength, shares);
          await this.update(proposalCreatedEvent);
        }
      );
    }
    this.querySelector('#time').textContent = status;
    this.querySelector('habitat-circle').setValue(signalStrength, renderAmount(totalShares), tokenSymbol);
    this.querySelector(`div#${flavor}`).style.display = 'block';

    if (userSignal) {
      this.querySelector('#feedback').textContent = `You Voted with ${renderAmount(userShares)} ${tokenSymbol}.`;
    }

    inputShares.value = userShares;
    inputShares.max = userShares;

    if (slider.value == slider.defaultValue) {
      slider.setRange(1, 100, 100, defaultSliderValue);
    }
  }
}

customElements.define('habitat-proposal', HabitatProposal);
