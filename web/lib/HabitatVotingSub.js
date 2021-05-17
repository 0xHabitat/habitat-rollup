import {
  wrapListener,
  renderAmount,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  submitVote,
  VotingStatus,
  getModuleInformation,
} from './rollup.js';
import HabitatCircle from '/lib/HabitatCircle.js';

const TEMPLATE =
`
<div>
  <label>
    The amount to stake
    <input style='min-width:100%;margin:auto;' class='smaller' id='shares' type='number' value='1'>
  </label>
  <p id='feedback' class='smaller center bold text-center' style='padding:0;margin:0;'></p>
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
</div>
`;

export default class HabitatVotingSub extends HTMLElement {
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

  async update ({ proposalId, vault }) {
    this.init();

    const { habitat } = await getProviders();
    const communityId = await habitat.communityOfVault(vault);
    const { flavor } = await getModuleInformation(vault);
    const slider = this.querySelector('habitat-slider');
    const inputShares = this.querySelector('#shares');
    const {
      defaultSliderValue,
      userShares,
      userSignal,
      proposalStatus,
      userBalance,
      tokenSymbol,
    } = await fetchProposalStats({ communityId, proposalId });
    const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);

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
          await this.update({ proposalId, vault });
          this.dispatchEvent(new Event('update'));
        }
      );
    }

    if (slider.value == slider.defaultValue) {
      slider.setRange(1, 100, 100, defaultSliderValue);
    }

    if (userShares > 0) {
      this.querySelector('#feedback').textContent = `You Voted with ${renderAmount(userShares)} ${tokenSymbol}.`;
    }

    this.querySelector(`div#${flavor}`).style.display = 'block';
    inputShares.value = userShares.toString();
    // xxx: take active voting stake into account
    inputShares.max = userBalance.toString();
  }
}

customElements.define('habitat-voting-sub', HabitatVotingSub);
