import {
  getTokenName,
  getEtherscanLink,
} from './utils.js';

const TEMPLATE =
`
<div class='listitem'>
<a></a>
<sep></sep>
<label>
Governance Token:
<a id='t' target='_blank' class='smaller'></a>
</label>
</div>
`;

export default class HabitatCommunity extends HTMLElement {
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
    let metadata;
    try {
      metadata = JSON.parse(evt.args.metadata);
    } catch (e) {
      console.error(e);
    }

    let ele = this.querySelector('a');
    ele.textContent = (metadata ? metadata.title : '') || '???';
    ele.href = `community/#${communityId}`;

    const tokenName = await getTokenName(governanceToken);
    ele = this.querySelector('a#t');
    ele.textContent = tokenName;
    ele.href = getEtherscanLink(governanceToken);
  }
}

customElements.define('habitat-community', HabitatCommunity);
