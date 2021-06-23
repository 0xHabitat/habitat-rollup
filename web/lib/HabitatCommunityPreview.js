import {
  getEtherscanLink
} from './utils.js';
import {
  getMetadataForTopic
} from './rollup.js';

const TEMPLATE =
`
<style>
.communityBox {
  border-radius: 2em;
  background-color: var(--color-accent-grey);
  cursor: pointer;
}
.communityBox img {
  width: 40ch;
  height: 20ch;
  border-radius: 2em;
}
</style>
<div class='communityBox'>
  <space></space>
  <a id='title'></a>
  <space></space>
  <a id='banner'><img></a>
</div>
`;

export default class HabitatCommunityPreview extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
    }
  }

  async update (evt) {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
    }

    const { communityId, governanceToken } = evt.args;
    const metadata = await getMetadataForTopic(communityId);
    const link = `#habitat-community,${evt.transactionHash}`;

    let ele = this.querySelector('a#title');
    ele.textContent = ((metadata ? metadata.title : '') || '???') + ' Community';
    ele.href = link;
    this.querySelector('a#banner').href = link;

    if (metadata.bannerCid) {
      this.querySelector('img').src = `https://${metadata.bannerCid}.ipfs.infura-ipfs.io/`;
    }
  }
}
customElements.define('habitat-community-preview', HabitatCommunityPreview);
