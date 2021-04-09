import {
  wrapListener,
  getEtherscanLink,
  secondsToString,
  renderAmount,
  walletIsConnected,
  getTokenSymbol,
  getErc20,
  ethers,
} from '/lib/utils.js';
import {
  getProviders,
  sendTransaction,
  decodeProposalActions,
  executeProposalActions,
  formatObject,
  humanProposalTime,
  getUsername,
  doQuery,
  fetchProposalStats,
  submitVote,
  VotingStatus,
} from '/lib/rollup.js';

const CIRCLES = `
<habitat-circle class='signal' id='participation' tag='Participation'></habitat-circle>
<habitat-circle id='votes' tag='Votes'></habitat-circle>
<habitat-circle class='signal' id='shares' tag='Shares'></habitat-circle>
`;

let communityId, proposalId, proposer, tx;

async function processProposal (proposalId) {
  const args = {
    proposalId,
  };

  await sendTransaction('ProcessProposal', args);
  await updateProposal();
}

async function executeProposal (proposalId, actionBytes) {
  const tx = await executeProposalActions(proposalId, actionBytes);
  // lazy :)
  window.location.href = getEtherscanLink(tx.hash);
}

async function updateProposal () {
  const { habitat } = await getProviders();

  const {
    totalShares,
    defaultSliderValue,
    signals,
    signalStrength,
    userShares,
    userSignal,
    totalVotes,
    participationRate,
    tokenSymbol,
    proposalStatus,
  } = await fetchProposalStats({ communityId, proposalId });
  const votingDisabled = proposalStatus.gt(VotingStatus.OPEN);
  const status = votingDisabled ? 'Proposal Concluded' : humanProposalTime(tx.message.startDate);

  document.querySelector('#vote').disabled = votingDisabled;
  document.querySelector('#finalize').disabled = votingDisabled;
  document.querySelector('#execProposal').disabled = !proposalStatus.eq(VotingStatus.PASSED);

  // some metadata below the proposal
  {
    const obj = {
      id: proposalId,
      status,
      proposer,
    };

    const container = document.querySelector('#proposalStats');
    const ele = formatObject(obj);
    ele.className = 'grid-2';
    container.innerHTML = '';
    container.appendChild(ele);
  }

  // statistics
  {
    const circles = document.querySelector('#circles');
    circles.innerHTML = CIRCLES;
    circles.querySelector('#participation').setValue(participationRate, `${participationRate.toFixed(2)}%`);
    circles.querySelector('#votes').setValue(100, totalVotes, totalVotes !== 1 ? 'Votes' : 'Vote');
    circles.querySelector('#shares').setValue(signalStrength, renderAmount(totalShares), totalShares !== 1 ? 'Shares' : 'Share');
  }

  if (userSignal) {
    document.querySelector('#feedback').textContent = `You Voted with ${renderAmount(userShares)} ${tokenSymbol}.`;
  }

  const slider = document.querySelector('habitat-slider#signal');
  if (slider.value == slider.defaultValue) {
    slider.setRange(1, 100, 100, defaultSliderValue);
  }
}

async function render () {
  const { habitat } = await getProviders();
  const proposalTxHash = window.location.hash.replace('#', '');
  tx = await habitat.provider.send('eth_getTransactionByHash', [proposalTxHash]);
  const receipt = await habitat.provider.send('eth_getTransactionReceipt', [proposalTxHash]);
  const proposalEvent = habitat.interface.parseLog(receipt.logs[0]);
  const slider = document.querySelector('habitat-slider#signal');
  proposer = await getUsername(receipt.from);
  console.log({tx,receipt});
  let metadata = {};
  try {
    metadata = JSON.parse(tx.message.metadata);
  } catch (e) {
    console.warn(e);
  }

  communityId = await habitat.communityOfVault(tx.message.vault);
  proposalId = proposalEvent.args.proposalId;

  document.querySelector('#visitVault').href = `../vault/#${tx.message.vault},${communityId}`;
  document.querySelector('#title').textContent = tx.message.title;
  document.querySelector('#proposal').textContent = metadata.details || '<no information>';

  const proposalActions = decodeProposalActions(tx.message.actions);
  {
    // proposal actions
    const grid = document.querySelector('.proposalActions');
    grid.innerHTML = '';
    for (let i = 0, len = proposalActions.length; i < len; i++) {
      const str = proposalActions[i];
      let e;

      if (i % 2 === 0) {
        // the contract address
        e = document.createElement('a');
        e.href = getEtherscanLink(str);
        e.target = '_blank';
      } else {
        // calldata
        e = document.createElement('p');
      }

      e.textContent = str;
      grid.appendChild(e);
    }
  }

  {
    wrapListener('button#vote', async () => {
      await submitVote(communityId, proposalId, slider.value);
      await updateProposal();
    });
    wrapListener('button#finalize', () => processProposal(proposalId));

    // any actions we can execute?
    // TODO: calculate estimate of bridge finalization time
    if (proposalActions.length) {
      wrapListener('button#execProposal', () => executeProposal(proposalId, tx.message.actions));
    }
  }

  await updateProposal();
  setInterval(updateProposal, 10000);
}

window.addEventListener('DOMContentLoaded', render, false);
