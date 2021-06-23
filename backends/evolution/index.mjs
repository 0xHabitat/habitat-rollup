import http from 'http';
import https from 'https';
import { parse } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { deflateRawSync } from 'zlib';
import { ethers } from 'ethers';

const DEFAULT_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'origin, content-type, accept, x-requested-with',
  'access-control-max-age': '300',
  'content-type': 'application/json',
};
const DEFAULT_HEADERS_DEFLATE = Object.assign({ 'content-encoding': 'deflate' }, DEFAULT_HEADERS);
const REQUEST_HANDLERS = Object.create(null);
const MAX_REQUEST_LENGTH = 8 << 10;
const FETCH_TIMEOUT_MS = 10000;
const CACHE_INTERVAL = 10000;
const REPO_UPDATE_INTERVAL = 120000;

const VOTING_BACKING_PATH = './data/votes.json';
const MAX_TIMESTAMP_DELTA = BigInt(60);
const MAX_SIGNAL = 100;
const MIN_SHARES_VOTE = BigInt(1);
const VOTING_STRUCT = [
  { name: 'account', type: 'address' },
  { name: 'signalStrength', type: 'uint8' },
  { name: 'shares', type: 'uint256' },
  { name: 'timestamp', type: 'uint256' },
  { name: 'link', type: 'string' },
];
const ERC20_ABI = ['function balanceOf(address) public view returns(uint256)'];
const GITHUB_ORG = process.env.GITHUB_ORG || '';
const GITHUB_API_KEY = process.env.GITHUB_API_KEY || '';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT) || 8080;
const TEST_ENV = !!process.env.TEST_ENV;
const L2_RPC_URL = process.env.L2_RPC_URL;
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS;
const L2_RPC_API_KEY = process.env.L2_RPC_API_KEY;

let globalRepoConfigs = Object.create(null);
let globalIssueCache = Object.create(null);
let globalLinkIndex = Object.create(null);
let globalVotingCache = [];
let lastGlobalUpdate = 0;
let lastGlobalRepoUpdate = 0;
let lastStatUpdate= 0;
let statCache = {};

function getRepoOfLink (url) {
  const start = url.indexOf(GITHUB_ORG) + GITHUB_ORG.length + 1;
  const end = url.indexOf('/', start);
  return url.substring(start, end);
}

async function fetch (url, headers) {
  return new Promise(
    function (resolve, reject) {
      const options = parse(url);
      options.headers = { 'user-agent': 'curl/7.64.1' };
      if (headers) {
        Object.assign(options.headers, headers);
      }
      const req = https.get(options);
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
    }
  );
}

async function githubFetch (path, raw = false) {
  const url =
    `https://api.github.com/${path}`;
  const headers = {
    'accept': `application/vnd.github.v3.${raw ? 'raw' : 'json'}`,
  };
  const str = await fetch(
    url,
    Object.assign(headers, GITHUB_API_KEY ? { 'Authorization': `token ${GITHUB_API_KEY}` } : {})
  );
  return raw ? str : JSON.parse(str);
}

async function fetchIssues (repo, labels) {
  const issues = [];

  for (const label of labels) {
    const ret = await githubFetch(`repos/${GITHUB_ORG}/${repo}/issues?state=open&labels=${label}&per_page=100`);
    for (const e of ret) {
      if (issues.findIndex((a) => a.id === e.id) === -1) {
        issues.push(e);
      }
    }
  }

  return issues;
}

function replaceAll (str, a, b) {
  let ret = str;

  while (true) {
    const tmp = ret.replace(a, b)

    if (ret === tmp) {
      break;
    }

    ret = tmp;
  }

  return ret;
}

async function fetchTokenHolders (tokenAddress) {
  // (From a total of N,NNN holders)
  // or
  // A total of N token holders
  const url = `https://etherscan.io/token/generic-tokenholders2?m=normal&a=${tokenAddress}`;
  const html = await fetch(url);
  const prologue = 'total of ';
  const epilogue = ' ';
  let i = html.indexOf(prologue) + prologue.length;
  return Number(replaceAll(html.substring(i, html.indexOf(epilogue, i)), ',', '')) | 0;
}

async function updateConfig () {
  const now = Date.now();
  if (now - lastGlobalRepoUpdate < REPO_UPDATE_INTERVAL) {
    return;
  }
  lastGlobalRepoUpdate = now;

  const newConfigs = Object.create(null);
  const results = await githubFetch(`orgs/${GITHUB_ORG}/repos?per_page=100`);

  for (const { name } of results) {
    let config;

    try {
      config = JSON.parse(await githubFetch(`repos/${GITHUB_ORG}/${name}/contents/.evolution.json`, true));
    } catch (e) {
      console.log(name, e);
      continue;
    }

    console.log(name, config);
    if (!config.tokenAddress) {
      continue;
    }

    const tmp = ethers.providers.getNetwork(config.chainId).name;
    const networkName = tmp === 'homestead' ? 'mainnet' : tmp;
    const provider = new ethers.providers.JsonRpcProvider(`https://${networkName}.infura.io/v3/${INFURA_API_KEY}`);
    const domain = { name: config.name, version: '1', verifyingContract: config.tokenAddress };
    const erc20 = new ethers.Contract(config.tokenAddress, ERC20_ABI, provider);
    newConfigs[name] = Object.assign(config, { domain, erc20 });
  }

  globalRepoConfigs = newConfigs;
}

async function update (force = false) {
  const now = Date.now();
  if (!force) {
    if (now - lastGlobalUpdate < CACHE_INTERVAL) {
      console.log('cache hit');
      return;
    }
  }
  lastGlobalUpdate = now;

  const newIssueCache = Object.create(null);
  const newLinkIndex = Object.create(null);
  for (const repoName in globalRepoConfigs) {
    const config = globalRepoConfigs[repoName];
    const totalHolders = await fetchTokenHolders(config.tokenAddress);
    const issues = await fetchIssues(repoName, config.labels || []);
    const obj = [];

    for (const issue of issues) {
      const { html_url, title } = issue;
      const labels = [];
      for (const label of issue.labels) {
        labels.push({ name: label.name, color: label.color });
      }
      const signal = { title, labels, link: html_url, signalStrength: 0, totalVotes: 0, totalShares: '0x0' };
      if (totalHolders) {
        const votesForIssue = globalVotingCache.filter((e) => e.message.link === html_url);

        if (votesForIssue.length) {
          let signalStrength = 0;
          let totalShares = BigInt(0);

          for (const vote of votesForIssue) {
            signalStrength += Number(vote.message.signalStrength) | 0;
            totalShares += BigInt(vote.message.shares);
          }
          signal.totalVotes = votesForIssue.length;
          signal.signalStrength = (signalStrength / votesForIssue.length);
          signal.totalShares = `0x${totalShares.toString(16)}`;
        }
      }
      obj.push(signal);
      newLinkIndex[signal.link] = signal;
    }
    newIssueCache[repoName] = obj.sort((a, b) => b.signalStrength - a.signalStrength);
  }

  // update global
  globalIssueCache = newIssueCache;
  globalLinkIndex = newLinkIndex;
}

async function getSignals ([org, repo, account]) {
  if (org !== GITHUB_ORG) {
    return [];
  }

  await update(false);

  const issues = globalIssueCache[repo] || [];
  if (account) {
    let payload = [];
    for (const issue of issues) {
      const idx = globalVotingCache.findIndex(
        (e) => e.message.account === account && e.message.link === issue.link
      );
      let userVotingShares = '0x0';
      let userVotingStrength = 0;
      if (idx !== -1) {
        const vote = globalVotingCache[idx];
        userVotingShares = vote.message.shares;
        userVotingStrength = vote.message.signalStrength;
      }
      payload.push(Object.assign({ userVotingShares, userVotingStrength }, issue));
    }
    return payload;
  }

  return issues;
}

async function submitVote (_args, jsonOject) {
  // copy
  const message = {
    account: jsonOject.message.account,
    signalStrength: Number(jsonOject.message.signalStrength),
    shares: jsonOject.message.shares,
    timestamp: jsonOject.message.timestamp,
    link: jsonOject.message.link,
  };
  const sig = jsonOject.sig;

  const issue = globalLinkIndex[message.link];
  if (!issue) {
    throw new Error('invalid link');
  }

  // xxx: validate more aspects of message
  if (BigInt(message.shares) < MIN_SHARES_VOTE) {
    throw new Error('not enough shares');
  }

  const repoName = getRepoOfLink(message.link);
  const { domain, erc20 } = globalRepoConfigs[repoName];
  const signer = ethers.utils.verifyTypedData(domain, { Vote: VOTING_STRUCT }, message, sig);
  if (signer !== message.account) {
    throw new Error('invalid signature');
  }

  const balance = await erc20.balanceOf(message.account);
  if (balance.lt(message.shares)) {
    throw new Error('balance of account is too low');
  }
  if (!balance.div(MAX_SIGNAL).mul(message.signalStrength).eq(message.shares)) {
    throw new Error('signal to share ratio is invalid');
  }

  const now = BigInt(~~(Date.now() / 1000));
  const maxTimestamp = now + MAX_TIMESTAMP_DELTA;
  const minTimestamp = now - MAX_TIMESTAMP_DELTA;
  const voteTimestamp = BigInt(message.timestamp);
  if (voteTimestamp > maxTimestamp || voteTimestamp < minTimestamp) {
    throw new Error('timestamp too high or too low');
  }

  const vote = { message, sig };
  if (TEST_ENV) {
    globalVotingCache.push(vote);
  } else {
    const existingVoteIdx = globalVotingCache.findIndex(
      (e) => e.message.account === message.account && e.message.link === message.link
    );

    // overwrite existing vote from account
    if (existingVoteIdx !== -1) {
      const oldVote = globalVotingCache[existingVoteIdx];
      if (voteTimestamp <= BigInt(oldVote.message.timestamp)) {
        throw new Error('a newer vote exists');
      }
      globalVotingCache[existingVoteIdx] = vote;
    } else {
      globalVotingCache.push(vote);
    }
  }

  try {
    writeFileSync(VOTING_BACKING_PATH, JSON.stringify(globalVotingCache));
  } catch (e) {
    console.log(e);
  }

  await update(true);

  return Object.assign({ userVotingShares: message.shares, userVotingStrength: message.signalStrength }, globalLinkIndex[message.link]);
}

async function getStats () {
  const now = Date.now();
  if (now - lastStatUpdate < CACHE_INTERVAL) {
    return statCache;
  }
  lastStatUpdate = now;

  await update(false);

  const totalHolders = {};
  let totalTopics = 0;
  for (const repoName in globalRepoConfigs) {
    const config = globalRepoConfigs[repoName];

    totalTopics += (globalIssueCache[repoName] || []).length;

    if (!totalHolders[config.tokenAddress]) {
      totalHolders[config.tokenAddress] = await fetchTokenHolders(config.tokenAddress);
    }
  }

  const totalVotes = globalVotingCache.length;
  statCache = { totalVotes, totalTopics, totalHolders };

  return statCache;
}

async function getGasAccount (account) {
  // uint256 nonce, address operator, address token, uint256 amount
  const filter = {
    fromBlock: 1,
    primaryTypes: ['TributeForOperator']
  };

  try {
    const from = account.toLowerCase();
    const txs = (await ethers.utils.fetchJson(L2_RPC_URL, JSON.stringify({ id: 1, method: 'eth_getLogs', params: [filter] }))).result;
    let value = 0n;
    for (const tx of txs) {
      if (tx.message.operator.toLowerCase() !== OPERATOR_ADDRESS || tx.from.toLowerCase() !== from) {
        continue;
      }
      // todo: check token
      value += BigInt(tx.message.amount);
    }
    // todo
    const remainingEstimate = '0x' + (value / 1000000000n).toString(16);

    return { value: '0x' + value.toString(16), remainingEstimate };
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}

async function getGasTank ([account]) {
  return getGasAccount(account);
}

async function submitTransaction (_args, jsonOject) {
  try {
    // todo check gas balance
    const ret = await ethers.utils.fetchJson(
      L2_RPC_URL,
      JSON.stringify({ id: 1, auth: L2_RPC_API_KEY, method: 'eth_sendRawTransaction', params: [jsonOject] })
    );

    return ret;
  } catch (e) {
    console.error(e);
    throw new Error('unknown error');
  }
}

async function startServer ({ host, port }) {
  async function onRequest (req, resp) {
    console.log(req.url);
    resp.sendDate = false;
    if (req.method !== 'GET' && req.method !== 'POST') {
      resp.writeHead(200, DEFAULT_HEADERS);
      resp.end();
      return;
    }

    let requestPayload;
    if (req.method === 'POST') {
      const len = parseInt(req.headers['content-length'] || MAX_REQUEST_LENGTH);

      if (len > MAX_REQUEST_LENGTH) {
        resp.writeHead(413);
        resp.end();
        return;
      }

      let body = '';
      req.on('data', function (buf) {
        body += buf.toString();

        // this is actually not correct but we also do not expect unicode
        if (body.length > len) {
          resp.abort();
        }
      });

      await new Promise(
        function (resolve, reject) {
          req.on('end', resolve);
          req.on('error', reject);
        }
      );
      try {
        requestPayload = JSON.parse(body);
      } catch (e) {
        console.log(e);
      }
    }

    const path = req.url.split('/');
    const func = REQUEST_HANDLERS[path[1]];
    const deflate = (req.headers['accept-encoding'] || '').indexOf('deflate') !== -1;
    resp.writeHead(200, deflate ? DEFAULT_HEADERS_DEFLATE : DEFAULT_HEADERS);
    try {
      if (!func) {
        throw new Error('teapot');
      }
      const res = JSON.stringify(await func(path.slice(2), requestPayload));
      resp.end(deflate ? deflateRawSync(res) : res);
    } catch (e) {
      console.log(e);
      const ret = `{"error":"${e.message || ''}"}`;
      resp.end(deflate ? deflateRawSync(ret) : ret);
    }

    // trigger update check for repos
    updateConfig();
  }

  const server = new http.Server(onRequest);
  server.timeout = 10000;
  server.listen(port, host);

  console.log(`listening on ${host}:${port}`);
}

process.on('SIGTERM', () => process.exit(0));
REQUEST_HANDLERS['stats'] = getStats;
REQUEST_HANDLERS['signals'] = getSignals;
REQUEST_HANDLERS['submitVote'] = submitVote;
REQUEST_HANDLERS['gasTank'] = getGasTank;
REQUEST_HANDLERS['submitTransaction'] = submitTransaction;
try {
  globalVotingCache = JSON.parse(readFileSync(VOTING_BACKING_PATH));
} catch (e) {
  console.log(e);
}
await startServer({ host: HOST, port: PORT });
