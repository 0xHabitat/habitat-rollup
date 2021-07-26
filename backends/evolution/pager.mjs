import { fetch, fetchJson } from './utils.mjs';
import { ethers } from 'ethers';

const UPDATE_INTERVAL = Number(process.env.UPDATE_INTERVAL) || 30000;
const ADDRS = (process.env.ADDRS || '').split(',');
const { RPC_URL, INTERNAL_RPC_URL, L2_RPC_API_KEY, PAGER_WEBHOOK } = process.env;
const CACHE = Object.create(null);

async function postMessage (content) {
  const resp = await fetch(PAGER_WEBHOOK, { 'content-type': 'application/json' }, JSON.stringify({ content }));
  console.log({ content, resp });
}

async function pager (k, str) {
  if (CACHE[k] === str) {
    console.log(`${k} - did not change`);
    return;
  }

  const lines = str.split('\n');
  let content = '';

  while (lines.length) {
    const line = lines.shift();
    if (!line) {
      continue;
    }
    content += '`' + line + '`\n';
    if (content.length > 1800) {
      await postMessage(content);
      content = '';
    }
  }

  if (content) {
    await postMessage(content);
  }

  CACHE[k] = str;
}

async function checkBalances () {
  let content = '';
  for (const addr of ADDRS) {
    const balance = Number(ethers.utils.formatUnits(await fetchJson(RPC_URL, 'eth_getBalance', [addr, 'latest']), 18));
    content += `Balance of ${addr} = ${balance}\n`;
  }
  await pager('balance', content);
}

async function checkEvents () {
  let result;
  try {
    result = await fetchJson(
      INTERNAL_RPC_URL,
      'debug_rollupStats',
      [],
      { auth: L2_RPC_API_KEY }
    );
  } catch (e) {
    console.error(e);
    await pager('chainError', 'error getting rollup statistics');
    return;
  }

  let str = `
🧱 Finalized Height: ${result.finalizedHeight}
⏳ # Of pending Blocks awaiting finalisation: ${result.blockWindow.length}
🚎 # of not yet submitted transactions: ${result.nUnsubmittedTransactions}
🤺 Fraud Proof Challenge active: ${result.challengeOffset ? 'yes' : 'no' }
`;
  for (const stat of result.blockWindow) {
    const correctSolution =
      stat.submittedSolutionHash ? (stat.submittedSolutionHash === stat.expectedSolutionHash ? '✅' : '❌') : '-';
    const disputed = stat.disputed ? 'yes' : 'no';
    const finalisable = stat.canFinalize ? 'yes' : 'no';
    const regularFinalisationBlock = stat.regularFinalizationTarget ? stat.regularFinalizationTarget : '-';
    str +=
      `| # 🧱 ${stat.blockNumber} | solution submitted: ${stat.submittedSolutionHash ? '👍' : '👎'} | solution correct: ${correctSolution} | disputed: ${disputed} | can be finalised: ${finalisable} | ${regularFinalisationBlock} |\n`
  }
  await pager('chain', str);
}

if (PAGER_WEBHOOK) {
  setInterval(checkBalances, UPDATE_INTERVAL);
  setInterval(checkEvents, UPDATE_INTERVAL);
}
