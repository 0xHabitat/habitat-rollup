import {
  wrapListener,
  renderAmount,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  submitVote,
  VotingStatus,
  humanProposalTime,
  renderLabels,
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

<div style="width:100%;height:1.4rem;font-size:.7rem;">
<h3 class="left inline" style="float:left;text-shadow:0 0 2px #909090;">❄️</h3>
<h3 class="right inline" style="float:right;text-shadow:0 0 2px #909090;">🔥</h3>
</div>

<habitat-slider></habitat-slider>
<label>
You can replace your vote any time.
</label>
<div class='flex row'>
<button id='vote' class='bold green' disabled>Vote</button>
<a target='_blank' id='open' class='button smaller purple'>View Proposal</a>
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

  async update (evt) {
    this.init();

    const { proposalId, startDate, vault } = evt.args;
    let metadata = {};
    let title = '???';
    try {
      metadata = JSON.parse(evt.args.metadata);
      title = metadata.title || title;
    } catch (e) {
      console.warn(e);
    }

    {
      // title / link elements
      const base = window.location.pathname.split('/')[1];
      const proposalLink = `/${base}/proposal/#${evt.transactionHash}`;
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
    const slider = this.querySelector('habitat-slider');
    wrapListener(
      this.querySelector('button#vote'),
      async () => {
        await submitVote(communityId, proposalId, slider.value);
        await this.update(evt);
      }
    );

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
    const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);
    const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(startDate);

    this.querySelector('#vote').disabled = votingDisabled;
    this.querySelector('#time').textContent = status;
    this.querySelector('habitat-circle').setValue(signalStrength, renderAmount(totalShares), tokenSymbol);

    if (userSignal) {
      this.querySelector('#feedback').textContent = `You Voted with ${renderAmount(userShares)} ${tokenSymbol}.`;
    }

    if (slider.value == slider.defaultValue) {
      slider.setRange(1, 100, 100, defaultSliderValue);
    }
  }
}

customElements.define('habitat-proposal', HabitatProposal);
