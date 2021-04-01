import { checkScroll, wrapListener, getEtherscanLink, getTokenName } from '/lib/utils.js';
import { getProviders, pullEvents } from '/lib/rollup.js';
import { CreateCommunityFlow } from '/lib/flows.js';

let loaded = {};

async function renderCommunity (evt) {
  const container = document.querySelector('#communities');
  const { communityId, governanceToken } = evt.args;
  let metadata;
  try {
    metadata = JSON.parse(evt.args.metadata);
  } catch (e) {
    console.error(e);
  }
  const tokenName = await getTokenName(governanceToken);
  const child = document.createElement('div');
  child.className = 'listitem';
  child.innerHTML = `
    <a href='community/#${communityId}'></a>
    <sep></sep>
    <label>
    Governance Token:
    <a target='_blank' class='smaller' href='${getEtherscanLink(governanceToken)}'>${tokenName}</a>
    </label>
    `;
  child.querySelector('a').textContent = (metadata ? metadata.title : '') || '???';
  container.appendChild(child);
}

async function fetchLatest () {
  const { habitat } = await getProviders();
  const filter = habitat.filters.CommunityCreated();
  filter.toBlock = await habitat.provider.getBlockNumber();

  for await (const evt of pullEvents(habitat, filter, 1)) {
    if (!loaded[evt.transactionHash]) {
      loaded[evt.transactionHash] = true;
      renderCommunity(evt);
    }
  }
}

async function fetchCommunities () {
  const { habitat } = await getProviders();
  const filter = habitat.filters.CommunityCreated();
  filter.toBlock = await habitat.provider.getBlockNumber();

  checkScroll(
    '.content',
    async function () {
      for await (const evt of pullEvents(habitat, filter)) {
        if (!loaded[evt.transactionHash]) {
          loaded[evt.transactionHash] = true;
          renderCommunity(evt);
        }
      }
    }
  );
}

async function render () {
  wrapListener('button#community', (evt) => new CreateCommunityFlow(evt.target, { callback: fetchLatest }));
  await fetchCommunities();
}

window.addEventListener('DOMContentLoaded', render, false);
