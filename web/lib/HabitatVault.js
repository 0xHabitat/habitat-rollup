import { wrapListener, checkScroll, secondsToString, renderAmount } from '/lib/utils.js';
import {
  getProviders,
  pullEvents,
  fetchProposalStats,
  humanProposalTime,
  submitVote,
  VotingStatus,
  getTransactionHashForCommunityId,
  fetchVaultInformation
} from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import './HabitatProposalPreview.js';

class HabitatVault extends HabitatPanel {
  static TEMPLATE =
  `
<style>
</style>
<section class='bgwhite'>
  <div class='flex evenly col center'>
    <h2>Proposals</h2>
  </div>
  <div id='buttons' class='flex row evenly'>
    <a id='propose' href='' class='button secondary purple smaller'>Create a Proposal</a>
    <a id='back' href='' class='button secondary purple smaller'>Community Overview</a>
  </div>
  <space></space>
</section>
<section>
  <div id='proposals' class='flex row evenly center'></div>
</section>
`;

  constructor() {
    super();

    this._loaded = {};
  }

  async chainUpdateCallback () {
    await this.fetchProposals();
  }

  async fetchProposals () {
    const { habitat } = await getProviders();
    const filter = habitat.filters.ProposalCreated(this.vaultAddress);
    filter.toBlock = await habitat.provider.getBlockNumber();

    const container = this.shadowRoot.querySelector('#proposals');
    for await (const evt of pullEvents(habitat, filter)) {
      if (this._loaded[evt.transactionHash]) {
        continue;
      }
      this._loaded[evt.transactionHash] = true;
      const child = document.createElement('habitat-proposal-preview');
      child.setAttribute('hash', evt.transactionHash);
      container.appendChild(child);
    }
  }

  async render () {
    const [, txHash] = this.getAttribute('args').split(',');
    const { vaultAddress, communityId, metadata } = await fetchVaultInformation(txHash);

    this.vaultAddress = vaultAddress;
    this.shadowRoot.querySelector('a#propose').href = `#habitat-propose,${txHash}`;
    this.shadowRoot.querySelector('a#back').href = `#habitat-community,${await getTransactionHashForCommunityId(communityId)}`;
    this.setTitle(metadata.title);

    await this.fetchProposals();
  }
}
customElements.define('habitat-vault', HabitatVault);
