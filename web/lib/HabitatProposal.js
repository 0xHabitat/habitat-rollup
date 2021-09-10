import {
  getTokenV2,
  ethers,
  getSigner,
} from '/lib/utils.js';
import {
  getProviders,
  getReceipt,
} from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import './HabitatToggle.js';
import './HabitatProposalCard.js';
import './HabitatTransactionCart.js';

export default class HabitatProposal extends HabitatPanel {
  static TEMPLATE =
`
<style>
:root, :host {
  --color-bg-button: var(--color-bg);
  --color-button: var(--color-bg-invert);
  --color-border-button: var(--color-bg-invert);
}
.delegateMode {
  --color-bg-button: var(--color-bg-invert);
  --color-button: var(--color-bg);
  --color-border-button: #a0a0a0;
}
button, .button {
  background-color: var(--color-bg-button);
  color: var(--color-button);
  border-color: var(--color-border-button);
}
#sticky {
  position: sticky;
  top: .5em;
  max-width: max-content;
  padding: .5em 1em;
  border-radius: 2em;
  background-color: var(--color-bg);
  border: 1px solid var(--color-bg-invert);
  z-index: 9;
}
</style>
<div style='padding:0 var(--panel-padding);'>
  <div style='margin: 0 auto;width:60em;max-width:100%;'>
    <section>
      <space></space>
      <div id='wrapper'>
        <div class='flex col' style='width:100%'>

        <div id='sticky' class='flex row center evenly'>
          <div class='flex row'>
            <habitat-toggle
              id='delegateModeToggle'
              left='Personal Mode'
              tooltip-left='Your personal voting power'
              right='Delegation Mode'
              tooltip-right='Voting power delegated to you'
            ></habitat-toggle>
            <habitat-transaction-cart></habitat-transaction-cart>
          </div>
        </div>
        <space></space>
        <habitat-proposal-card expand></habitat-proposal-card>
      </div>
    </section>
  </div>
</div>
`;

  constructor() {
    super();

    this.shadowRoot.querySelector('#delegateModeToggle').addEventListener('toggle', this.onToggle.bind(this), false);
    this.shadowRoot.querySelector('habitat-proposal-card').addEventListener('signalChange', this.submitChanges.bind(this), false);
  }

  get title () {
    return 'Proposal';
  }

  get delegationMode () {
    return this.classList.contains('delegateMode');
  }

  onToggle () {
    const delegateMode = this.classList.toggle('delegateMode');
    for (const node of this.shadowRoot.querySelectorAll('habitat-proposal-card')) {
      node.setAttribute('delegate-mode', delegateMode || '');
    }
  }

  async render () {
    const [, txHash] = this.getAttribute('args').split(',');
    if (!txHash) {
      return;
    }

    const { habitat } = await getProviders();
    const receipt = await getReceipt(txHash);
    const vaultAddress = receipt.events[0].args.vault;
    const communityId = await habitat.callStatic.communityOfVault(vaultAddress);
    const token = await getTokenV2(await habitat.callStatic.tokenOfCommunity(communityId));
    const tvl = await habitat.callStatic.getTotalValueLocked(token.address);
    const refSignal = ethers.utils.formatUnits(tvl, token.decimals);
    const card = this.shadowRoot.querySelector('habitat-proposal-card');
    card.setAttribute('ref-signal', refSignal);
    card.setAttribute('hash', txHash);
  }

  async submitChanges () {
    let delegatedFor = ethers.constants.AddressZero;
    if (this.delegationMode) {
      const signer = await getSigner();
      delegatedFor = await signer.getAddress();
    }

    const batch = [];
    const cards = this.shadowRoot.querySelectorAll('habitat-proposal-card');
    for (const node of cards) {
      batch.push(...(await node.buildTransactions(delegatedFor)));
    }

    window.postMessage({ type: 'hbt-tx-bundle', value: batch }, window.location.origin);
  }
}
customElements.define('habitat-proposal', HabitatProposal);
