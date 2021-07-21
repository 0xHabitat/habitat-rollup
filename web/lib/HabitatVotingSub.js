import {
  wrapListener,
  renderAmount,
  getSigner,
  getTokenV2,
  ethers,
} from './utils.js';
import {
  getProviders,
  fetchProposalStats,
  submitVote,
  VotingStatus,
  getModuleInformation,
  getDelegatedAmountsForToken,
  doQueryWithOptions,
  getProposalInformation,
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<div style='border:1px solid var(--color-text);padding:.3em;border-radius: .3em;'>
  <div>
    <label>
      Choose your voting method.
      <br>
      <button id='personal' class='secondary nohover selected'>Personal Vote</button>
      <button id='delegate' class='secondary nohover'>Delegate Vote</button>
    </label>
    <label>
      The amount to stake
      <br>
      <input style='min-width:100%;margin:auto;' class='smaller' id='shares' type='number' value='1'>
    </label>
    <p id='feedback' class='smaller center bold text-center' style='padding:0;margin:0;'></p>
    <p id='available' class='smaller bold'></p>
  </div>

  <div id='binary' class='flex row center' style='display:none;width:20ch;'>
    <label>
      A binary vote stakes your amount above on either Yes or No.
      <br>
      <div class='flex row center'>
        <button id='vote' class='bold yes green' disabled>Yes</button>
        <button id='vote' class='bold no red' disabled>No</button>
      </div>
    </label>
  </div>
  <div id='signal' class='flex row center' style='display:none;width:30ch;'>
    <div style="width:100%;height:1.4rem;font-size:.7rem;">
      <h3 class="left inline" style="float:left;text-shadow:0 0 2px #909090;"><emoji-snowflake></emoji-snowflake></h3>
      <h3 class="right inline" style="float:right;text-shadow:0 0 2px #909090;"><emoji-fire></emoji-fire></h3>
    </div>
    <habitat-slider></habitat-slider>
    <label>
      A signaling vote stakes your amount above and your signaled importance on this proposal.
      <br>
      <button id='vote' class='bold signal' disabled>Vote</button>
    </label>
  </div>
</div>
`;

const ATTR_HASH = 'hash';
const SELECTED = 'selected';

export default class HabitatVotingSub extends HTMLElement {
  static get observedAttributes() {
    return [ATTR_HASH];
  }

  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));

    this._personalBtn = this.shadowRoot.querySelector('button#personal');
    this._delegateBtn = this.shadowRoot.querySelector('button#delegate');
    this._slider = this.shadowRoot.querySelector('habitat-slider');
    this._inputShares = this.shadowRoot.querySelector('#shares');
    this._flavor = 'binary';

    wrapListener(
      this._personalBtn,
      this.switchToPersonal.bind(this)
    );
    wrapListener(
      this._delegateBtn,
      this.switchToDelegate.bind(this)
    );

    for (const ele of this.shadowRoot.querySelectorAll('button#vote')) {
      ele.disabled = true;
      wrapListener(
        ele,
        async (evt) => {
          let signalStrength = 0;
          const shares = this._inputShares.value;

          if (this._flavor === 'binary') {
            signalStrength = evt.target.classList.contains('yes') ? 100 : 1;
          } else if (this._flavor === 'signal') {
            signalStrength = Number(this._slider.value);
          }

          let account = null;
          if (this._delegateBtn.classList.contains(SELECTED)) {
            const signer = await getSigner();
            account = await signer.getAddress();
          }
          await submitVote(this._communityId, this._proposalId, signalStrength, shares, account);
          await this.update();
          this.dispatchEvent(new Event('update'));
        }
      );
    }
  }

  connectedCallback () {
  }

  disconnectedCallback () {
  }

  adoptedCallback () {
  }

  attributeChangedCallback (name, oldValue, newValue) {
    return this.update();
  }

  async switchToPersonal () {
    this._personalBtn.classList.add(SELECTED);
    this._delegateBtn.classList.remove(SELECTED);
    await this.update();
  }

  async switchToDelegate () {
    this._personalBtn.classList.remove(SELECTED);
    this._delegateBtn.classList.add(SELECTED);
    await this.update();
  }

  async update () {
    const txHash = this.getAttribute(ATTR_HASH);
    if (!txHash) {
      return;
    }

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
    const { flavor } = await getModuleInformation(vaultAddress);
    let {
        defaultSliderValue,
        userShares,
        userSignal,
        proposalStatus,
        userBalance,
        tokenSymbol,
        governanceToken,
    } = await fetchProposalStats({ communityId, proposalId });

    const votingDisabled = proposalStatus > VotingStatus.OPEN;
    for (const ele of this.shadowRoot.querySelectorAll('button#vote')) {
      ele.disabled = votingDisabled;
    }

    let feedback = '';
    if (this._delegateBtn.classList.contains(SELECTED)) {
      const signer = await getSigner();
      const account = await signer.getAddress();
      const erc = await getTokenV2(governanceToken);
      const { total, used, free } = await getDelegatedAmountsForToken(governanceToken, account);
      const logs = await doQueryWithOptions({ maxResults: 1, toBlock: 1 }, 'DelegateeVotedOnProposal', account, proposalId);
      if (logs.length) {
        const { signalStrength, shares } = logs[0].args;

        userShares = ethers.utils.formatUnits(shares, erc.decimals);
        feedback = `You Voted with ${renderAmount(shares, erc.decimals)} out of ${renderAmount(total, erc.decimals)} ${erc.symbol}.`;
        defaultSliderValue = Number(signalStrength);
      } else {
        feedback = `You can vote up to ${renderAmount(free, erc.decimals)} ${erc.symbol}.`;
      }
    } else {
      feedback =
        `You Voted with ${renderAmount(userShares)} out of ${renderAmount(userBalance)} ${tokenSymbol}.`;
    }

    if (this._slider.value == this._slider.defaultValue) {
      this._slider.setRange(0, 100, 100, defaultSliderValue);
    }

    this._inputShares.value = userShares.toString();
    this._inputShares.max = userBalance.toString();
    this.shadowRoot.querySelector('#feedback').textContent = feedback;
    this.shadowRoot.querySelector(`div#${flavor}`).style.display = 'block';
    this._flavor = flavor;
    this._communityId = communityId;
    this._proposalId = proposalId;
  }
}

customElements.define('habitat-voting-sub', HabitatVotingSub);
