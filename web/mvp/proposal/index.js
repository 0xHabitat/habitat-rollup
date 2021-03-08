import { formatObject, computeVotePercentages, wrapListener, getEtherscanLink, secondsToHms } from '../common/utils.js';
import { getProviders, sendTransaction, decodeProposalActions, executeProposalActions } from '../common/tx.js';

async function submitVote (proposalIndex, uintVote) {
  const args = {
    proposalIndex,
    uintVote,
  };

  await sendTransaction('SubmitVote', args);

  // lazy, reload page
  window.location.reload();
}

async function processProposal (proposalIndex) {
  const args = {
    proposalIndex,
  };

  await sendTransaction('ProcessProposal', args);

  // lazy, reload page
  window.location.reload();
}

async function executeProposal (proposalId, actionBytes) {
  const tx = await executeProposalActions(proposalId, actionBytes);
  // lazy :)
  window.location.href = getEtherscanLink(tx.hash);
}

async function render () {
  const { habitat } = await getProviders();
  const proposalTxHash = window.location.hash.replace('#', '');
  const tx = await habitat.provider.send('eth_getTransactionByHash', [proposalTxHash]);
  const receipt = await habitat.provider.send('eth_getTransactionReceipt', [proposalTxHash]);
  const submitProposalEvent = habitat.interface.parseLog(receipt.logs[0]);
  const proposalId = submitProposalEvent.values.proposalIndex.toString();
  const proposal = await habitat.proposalQueue(proposalId);
  const totalShares = await habitat.totalShares();
  const { yay, nay, participationRate } = computeVotePercentages(proposal, totalShares);
  const expired = await habitat.hasVotingPeriodExpired(proposal.startingPeriod);
  const votingDisabled = expired || proposal.didPass || proposal.processed || proposal.aborted;

  const currentPeriod = await habitat.getCurrentPeriod();
  const votingPeriodLength = await habitat.votingPeriodLength();
  const periodDuration = await habitat.periodDuration();

  const lengthInSeconds = (((+proposal.startingPeriod)+(+votingPeriodLength))-(+currentPeriod))*(+periodDuration);

  let status = expired ? 'Voting Ended' : secondsToHms(lengthInSeconds);
  if (proposal.aborted) {
    status = 'aborted by proposer';
  } else if (proposal.didPass) {
    status = 'passed';
  } else if (proposal.processed) {
    status = 'processed';
  }

  const obj = {
    id: proposalId,
    status,
    yay: `${(yay * 100).toFixed(2)} %`,
    nay: `${(nay * 100).toFixed(2)} %`,
    proposer: proposal.proposer,
  };

  if (!expired) {
    obj['Participation Rate'] = `${(participationRate * 100).toFixed(2)} %`;
  }

  const container = document.querySelector('.proposal');
  let ele = formatObject(obj);
  ele.className = 'grid2';
  container.appendChild(ele);

  ele = document.createElement('p');
  ele.className = 'details';
  ele.textContent = tx.message.details;
  container.appendChild(ele);

  const proposalActions = decodeProposalActions(tx.message.actions);
  {
    // proposal actions
    const grid = document.querySelector('.proposalActions');
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

  // buttons
  const actions = document.querySelector('.actions');
  if (!votingDisabled) {
    // yay
    wrapListener('button#yay', () => submitVote(proposalId, 1));
    // nay
    wrapListener('button#nay', () => submitVote(proposalId, 2));
  }

  if (!proposal.processed) {
    wrapListener('button#finalize', () => processProposal(proposalId));
  } else {
    // any actions we can execute?
    // TODO: calculate estimate of bridge finalization time
    if (proposal.didPass && proposalActions.length) {
      wrapListener('button#execProposal', () => executeProposal(proposalId, tx.message.actions));
    }
  }
}

window.addEventListener('DOMContentLoaded', render, false);
