import {
  getEtherscanLink
} from './utils.js';
import {
  getMetadataForTopic
} from './rollup.js';
import { COMMON_STYLESHEET } from './component.js';

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
.communityBox {
  border-radius: 2em;
  background-color: var(--color-accent-grey);
  cursor: pointer;
  min-height: 20ch;
}
.communityBox img {
  width: 40ch;
  max-width: 100%;
  border-radius: 2em;
}
</style>
<div class='communityBox'>
  <space></space>
  <a class='bold big' id='title'></a>
  <space></space>
  <a id='banner'><img></a>
</div>
`;

export default class HabitatCommunityPreview extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(COMMON_STYLESHEET.cloneNode(true), TEMPLATE.content.cloneNode(true));
  }

  async update (evt) {
    const { communityId, governanceToken } = evt.args;
    const metadata = await getMetadataForTopic(communityId);
    const link = `#habitat-community,${evt.transactionHash}`;

    let ele = this.shadowRoot.querySelector('a#title');
    ele.textContent = (metadata ? metadata.title : '') || '???';
    ele.href = link;
    this.shadowRoot.querySelector('a#banner').href = link;

    if (metadata.bannerCid) {
      this.shadowRoot.querySelector('img').src = `https://${metadata.bannerCid}.ipfs.infura-ipfs.io/`;
    }
  }
}
customElements.define('habitat-community-preview', HabitatCommunityPreview);
