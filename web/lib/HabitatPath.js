import {
  getCommunityInformation,
  getTreasuryInformation,
  getProposalInformation,
} from './rollup.js';

const TEMPLATE =
`
<div>
  <div class='flex row evenly'>
    <div id='path' class='flex row center' style='margin:0;'></div>
    <a target='_blank' style='margin:0;' class='button secondary purple smaller' href='/testnet/explorer/'>Block Explorer</a>
  </div>
  <space></space>
</div>`;

const BASE = window.location.pathname.split('/')[1];
const ROOT = { title: 'Communities', href: `/${BASE}/` };

class Locations {
  static async propose (args) {
    const [treasuryAddress, communityId] = args;
    return [
      ...(await this.vault(args)),
      { title: 'Proposal', href: `${ROOT.href}propose/#${treasuryAddress},${communityId}` }
    ];
  }

  static async proposal (args) {
    const [proposalTxHash] = args;
    const info = await getProposalInformation(proposalTxHash);
    return [
      ...(await this.vault([info.vaultAddress, info.communityId])),
      { title: `${info.title}`, href: `${ROOT.href}proposal/#${proposalTxHash}` }
    ];
  }

  static async vault (args) {
    const [treasuryAddress, communityId] = args;
    const info = await getTreasuryInformation(treasuryAddress);
    return [
      ...(await this.community([communityId])),
      { title: `${info.title}`, href: `${ROOT.href}vault/#${treasuryAddress},${communityId}` }
    ];
  }

  static async community (args) {
    const [communityId] = args;
    const info = await getCommunityInformation(communityId);
    return [
      ROOT,
      { title: `${info.title}`, href: `${ROOT.href}community/#${communityId}` }
    ];
  }
}

class HabitatPath extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback () {
    if (!this.children.length) {
      this.innerHTML = TEMPLATE;
      this._path = this.querySelector('#path');

      this.setContext();
    }
  }

  async setContext () {
    const parts = window.location.pathname.split('/');
    const lastPart = parts[parts.length - 2];
    const args = window.location.hash.substring(1).split(',');

    this.setPath(Locations[lastPart] ? await Locations[lastPart](args) : [ROOT]);
  }

  setPath (path) {
    this._path.innerHTML = '';
    for (const { title, href } of path) {
      const e = document.createElement('a');
      e.textContent = `/${title}`;
      e.href = href;
      this._path.appendChild(e);
    }
  }
}

customElements.define('habitat-path', HabitatPath);
