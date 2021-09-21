import {
  ethers,
  getConfig,
  getEtherscanTokenLink,
  getSigner,
  renderAmount,
} from './utils.js';
import {
  doQueryWithOptions,
  updateVERC,
  getProviders,
  VERC_FACTORY_ABI,
} from './rollup.js';

const { VERC_FACTORY_ADDRESS } = getConfig();

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = `
<style>
* {
  color: var(--color-text);
  line-height: 1;
  white-space: pre-wrap;
  word-break: break-word;
  vertical-align: bottom;
}
.wrapper {
  border-radius: 2em;
  background-color: var(--color-bg);
  max-width: max-content;
  padding: 1rem;
}
#content {
  display: grid;
  grid-template-columns: repeat(5, auto);
  gap: 1rem;
  align-items: center;
}
</style>
<div class='wrapper'>
  <div id='content'></div>
</div>
`;

const LIST_HEADER = document.createElement('template');
LIST_HEADER.innerHTML = `
<span> </span>
<span> Decimals</span>
<span> Total Supply</span>
<span> Address</span>
<span> </span>
`;

const LIST_TEMPLATE = document.createElement('template');
LIST_TEMPLATE.innerHTML = `
<habitat-token-element></habitat-token-element>
<span> </span>
<span> </span>
<a target='_blank' style='font-size:.75em;text-decoration:none;'> </a>
<a target='_blank' href='' style='text-decoration:underline;'>Deploy Token on Ethereum</a>
`;

export default class HabitatVERCList extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(TEMPLATE.content.cloneNode(true));

    this.render();
  }

  async render () {
    // load
    await updateVERC();

    const { rootProvider } = await getProviders();
    const items = document.createElement('div');
    const logs = await doQueryWithOptions({ toBlock: 1, includeTx: true }, 'VirtualERC20Created');
    for (const log of logs) {
      const msg = log.transaction.message;
      const address = log.args[1].toLowerCase();

      if (msg.factoryAddress !== VERC_FACTORY_ADDRESS) {
        console.warn('VERC skip', msg);
        continue;
      }

      try {
        const [name, symbol, decimals, totalSupply, domainSeparator] = ethers.utils.defaultAbiCoder.decode(
          ['string', 'string', 'uint8', 'uint256', 'bytes32'],
          msg.args
        );
        const existsOnMainnet = (await rootProvider.getCode(address)) !== '0x';
        const e = LIST_TEMPLATE.content.cloneNode(true);
        e.children[0].setAttribute('token', address);
        e.children[1].textContent = decimals;

        e.children[2].textContent = renderAmount(totalSupply, decimals);

        e.children[3].textContent = address;
        const etherscanLink = getEtherscanTokenLink(address);
        e.children[3].href = etherscanLink;

        const status = e.children[4];
        status.href = etherscanLink;
        function setDeployed (str) {
          status.textContent = str || '✔ Deployed';
        }

        if (!existsOnMainnet) {
          status.addEventListener('click', async (evt) => {
            if (status.disabled) {
              return;
            }

            evt.preventDefault();

            try {
              status.disabled = true;
              const vercFactory = new ethers.Contract(VERC_FACTORY_ADDRESS, VERC_FACTORY_ABI, await getSigner());
              const tx = await vercFactory.createProxy(name, symbol, decimals, totalSupply, domainSeparator);
              setDeployed('Pending...');
              await tx.wait();
              setDeployed();
            } catch (e) {
              status.disabled = false;
            }
          }, false);
        } else {
          setDeployed();
        }
        items.append(e);
      } catch (e) {
        console.error(e);
      }
    }
    this.shadowRoot.querySelector('#content').replaceChildren(LIST_HEADER.content.cloneNode(true), ...items.children);
  }
}
customElements.define('habitat-verc-list', HabitatVERCList);
