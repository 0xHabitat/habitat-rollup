import { checkScroll, wrapListener, getEtherscanLink } from '/lib/utils.js';
import { getProviders, pullEvents, onChainUpdate } from '/lib/rollup.js';
import HabitatPanel from '/lib/HabitatPanel.js';
import '/lib/HabitatCommunityPreview.js';
import '/lib/HabitatCommunityPreviewCreator.js';

class HabitatCommunities extends HabitatPanel {
  static TEMPLATE =
  `
<style>
#communities {
  gap: 1em;
}
</style>
<space></space>
<div id='buttons' class='flex row' style='place-content:flex-end;'>
  <button id='community'>Create</button>
</div>
<space></space>
<div id='communities' class='flex row center evenly'></div>
<space></space>
`;

  constructor() {
    super();

    this._loaded = {};
  }

  get title () {
    return 'Communites on Habitat';
  }

  async render () {
    wrapListener(
      this.shadowRoot.querySelector('button#community'),
      (evt) => {
        this.shadowRoot.querySelector('#communities').prepend(document.createElement('habitat-community-preview-creator'));
      }
    );

    const { habitat } = await getProviders();
    const filter = habitat.filters.CommunityCreated();
    filter.toBlock = await habitat.provider.getBlockNumber();

    checkScroll(
      this.shadowRoot.querySelector('#content'),
      async () => {
        for await (const evt of pullEvents(habitat, filter)) {
          if (!this._loaded[evt.transactionHash]) {
            this._loaded[evt.transactionHash] = true;
            this.renderCommunity(evt);
          }
        }
      }
    );
  }

  async chainUpdateCallback () {
    await this.fetchLatest();
  }

  async fetchLatest () {
    const { habitat } = await getProviders();
    const filter = habitat.filters.CommunityCreated();
    filter.toBlock = await habitat.provider.getBlockNumber();

    for await (const evt of pullEvents(habitat, filter, 1)) {
      if (!this._loaded[evt.transactionHash]) {
        this._loaded[evt.transactionHash] = true;
        this.renderCommunity(evt, true);
      }
    }
  }

  async renderCommunity (evt, prepend = false) {
    const container = this.shadowRoot.querySelector('#communities');
    const ele = document.createElement('habitat-community-preview');
    // happens asyncly
    ele.update(evt);
    if (prepend) {
      container.prepend(ele);
    } else {
      container.append(ele);
    }
  }
}
customElements.define('habitat-communities', HabitatCommunities);
