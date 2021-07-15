import https from 'https';
import { parse } from 'url';
import { ethers } from 'ethers';

async function fetch (url, headers, payload) {
  return new Promise(
    function (resolve, reject) {
      const options = parse(url);
      options.headers = { 'user-agent': 'curl/7.64.1' };
      options.method = payload ? 'POST' : 'GET';
      if (headers) {
        Object.assign(options.headers, headers);
      }

      const req = https.request(url, options);
      req.setTimeout(FETCH_TIMEOUT_MS, () => req.abort());
      req.on('error', reject);
      req.on('socket', (socket) => socket.setTimeout(FETCH_TIMEOUT_MS));
      req.on('response', function (resp) {
        let data = '';
        resp.on('data', function (buf) {
          data += buf.toString();
        });
        resp.on('end', function () {
          resolve(data);
        });
      });
      req.end(payload);
    }
  );
}

const FETCH_TIMEOUT_MS = 10000;
const UPDATE_INTERVAL = Number(process.env.UPDATE_INTERVAL) || 30000;
const ADDRS = process.env.ADDRS.split(',');
const MIN_BALANCE = Number(process.env.MIN_BALANCE) || .3;
const { RPC_URL, INTERNAL_RPC_URL, L2_RPC_API_KEY, WEBHOOK } = process.env;
const CACHE = Object.create(null);
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

async function postMessage (content) {
  const resp = await fetch(WEBHOOK, { 'content-type': 'application/json' }, JSON.stringify({ content }));
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
    const balance = Number(ethers.utils.formatUnits(await provider.getBalance(addr), 18));
    //if (balance < MIN_BALANCE) {
    content += `Balance of ${addr} = ${balance}\n`;
    //}
  }
  await pager('balance', content);
}

async function checkEvents () {
  const ret = await ethers.utils.fetchJson(
    INTERNAL_RPC_URL,
    JSON.stringify({ auth: L2_RPC_API_KEY, method: 'debug_rollupStats' })
  );

  if (ret.error) {
    console.error(ret.error);
    await pager('chainError', ret.error.message);
    return;
  }

  const { result } = ret;
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

setInterval(checkBalances, UPDATE_INTERVAL);
setInterval(checkEvents, UPDATE_INTERVAL);
