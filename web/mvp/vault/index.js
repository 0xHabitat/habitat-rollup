import { checkScroll, secondsToString } from '/lib/utils.js';
import { getProviders, pullEvents } from '/lib/rollup.js';

const PROPOSAL_TEMPLATE =
`
<div style='height:2.5rem;overflow:hidden;'>
<a style='font-size:1.2rem;' class='bold' target='_blank' id='title'></a>
</div>
<div id='labels' class='flex row'></div>
<sep></sep>
<center style='padding-bottom:1rem;'>
<div class='circle'>
<div class='inner flex col center'>
<h1 id='signal'>-</h1>
<p>HBT</p>
</div>
</div>
<p id='totalVotes' class='text-center smaller bold' style='padding:.3rem;'></p>
<p id='feedback' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
<p id='time' class='smaller center bold text-center' style='padding-top:.5rem;'> </p>
</center>

<div style="width:100%;height:1.4rem;font-size:.7rem;">
<h3 class="left inline" style="float:left;text-shadow:0 0 2px #909090;">❄️</h3>
<h3 class="right inline" style="float:right;text-shadow:0 0 2px #909090;">🔥</h3>
</div>

<habitat-slider></habitat-slider>
<label>
You can replace your vote any time.
</label>
<div class='flex row'>
<button id='vote' class='bold green'>Vote</button>
<a target='_blank' id='open' class='button smaller purple'>Open Link</a>
</div>
`;

async function fetchProposals (vaultAddress) {
  const { habitat } = await getProviders();
  const blockNum = await habitat.provider.getBlockNumber();
  const filter = habitat.filters.ProposalCreated(vaultAddress);

  filter.toBlock = blockNum;

  const container = document.querySelector('#vaults');
  for await (const evt of pullEvents(habitat, filter, 10)) {
    console.log(evt);
    const { proposalId, startDate, title, actions } = evt.args;
    const child = document.createElement('div');
    child.className = 'listitem';
    child.innerHTML = PROPOSAL_TEMPLATE;
    child.querySelector('#title').textContent = title;
    const p = child.querySelector('#time');
    const now = ~~(Date.now() / 1000);
    if (startDate >= now) {
      p.textContent = `starts in ${secondsToString(startDate - now)}`;
    } else {
      p.textContent = `open since ${secondsToString(now - startDate)}`;
    }
    const slider = child.querySelector('habitat-slider');
    slider.setRange(1, 100, 100, 50);
    container.appendChild(child);
  }
}

async function render () {
  const vaultAddress = window.location.hash.replace('#', '');
  await fetchProposals(vaultAddress);
}

window.addEventListener('DOMContentLoaded', render, false);
