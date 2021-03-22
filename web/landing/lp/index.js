import {
  wrapListener,
  renderAmount,
  walletIsConnected,
  getSigner,
  getProvider,
  renderAddress,
  getEtherscanLink,
  secondsToString,
} from '/lib/utils.js';
import {
  HBT,
} from '/lib/config.js';

import { ethers } from '/lib/extern/ethers.esm.min.js';

const UNISWAP_PAIR = '0xc7a1cb6edc22e94f17c80eb5b959f2ad28511d4e';
const MINT_TOPIC = '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f';
const BURN_TOPIC = '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const START_BLOCK = 12_010_274;
const PRECISION = 10000;

// seconds
const ONE_DAY_SECONDS = 3600 * 24;
const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;
const MAX_SECONDS = ONE_WEEK_SECONDS * 12;
const MAX_DAYS = MAX_SECONDS / ONE_DAY_SECONDS;
const MAX_HBT = 2_000_000;
const MAX_SHARE = Math.sqrt(MAX_HBT) * (MAX_SECONDS * MAX_SECONDS);
const MAX_REWARD_DAY = 2143;
const START_DATE = 1615372251;
const END_DATE = START_DATE + MAX_SECONDS;
const MIN_LP_AMOUNT = 300;

const globalBlocks = JSON.parse(localStorage.getItem('gblocks') || '{}');
const provider = getProvider();
const uniswapPair = new ethers.Contract(
  UNISWAP_PAIR,
  [
    'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
    'function totalSupply() public view returns (uint256)',
  ],
  provider
);

async function update () {
  const delta = END_DATE - ~~(Date.now() / 1000);
  document.querySelector('#timeLeft').textContent = secondsToString(delta);

  let account;
  if (walletIsConnected()) {
    const signer = await getSigner();
    account = (await signer.getAddress()).toLowerCase();
  }

  const eventFilter = {
    address: UNISWAP_PAIR,
    topics: [[MINT_TOPIC, BURN_TOPIC, TRANSFER_TOPIC]],
    fromBlock: `0x${START_BLOCK.toString(16)}`,
    toBlock: 'latest',
  };
  // fetch mint, burn and transfer events of the uniswap pair and gather timestamps
  const logs = await provider.send('eth_getLogs', [eventFilter]);
  const slider = document.querySelector('#progress habitat-slider');

  // fetch timestamps
  const todo = [];
  let lastLog;
  for (let i = 0, len = logs.length; i < len; i++) {
    slider.setRange(i, i, len);

    const log = logs[i];
    const { timestamp } = globalBlocks[log.blockHash] || await provider.getBlock(log.blockHash);
    globalBlocks[log.blockHash] = { timestamp };

    if (timestamp > END_DATE) {
      // done
      break;
    }

    if (lastLog && lastLog.transactionHash === log.transactionHash) {
      lastLog.logs.push(log);
      if (i === len-1) {
        todo.push(lastLog);
      }
    } else {
      // sortout transactions with no mint or burn events
      if (lastLog && lastLog.logs.find((e) => e.topics[0] === MINT_TOPIC || e.topics[0] === BURN_TOPIC)) {
        todo.push(lastLog);
      } else {
        console.log('ignoring', lastLog);
      }
      lastLog = { transactionHash: log.transactionHash, timestamp, logs: [log] };
    }
  }

  slider.parentElement.style.display = 'none';

  // save/cache
  localStorage.setItem('gblocks', JSON.stringify(globalBlocks));

  // filter the events and keep track of pool shares for each day
  const days = [];
  let prevDay = {};
  let totalPool = BigInt(0);
  // assuming insertition order
  for (const { timestamp, logs } of todo) {
    const day = ~~((timestamp - START_DATE) / ONE_DAY_SECONDS);
    const accountMap = days[day] || Object.assign({}, prevDay);
    prevDay = accountMap;
    days[day] = accountMap;

    let transfers = [];
    for (const log of logs) {
      const topic = log.topics[0];

      if (topic === TRANSFER_TOPIC) {
        transfers.push(log);
        continue;
      }

      const isMint = topic === MINT_TOPIC;
      const isBurn = topic === BURN_TOPIC;
      if (!isMint && !isBurn) {
        continue;
      }

      const transferAmount = BigInt(transfers[transfers.length - 1].data);
      // for a burn, we get the owner from the transfer event before the last one
      const from =
        `0x${(isMint ? transfers[transfers.length - 1].topics[2] : transfers[transfers.length - 2].topics[1]).slice(-40)}`;
      let balance = accountMap[from] || BigInt(0);

      if (topic === MINT_TOPIC) {
        totalPool += transferAmount;
        balance += transferAmount;
      }
      if (topic === BURN_TOPIC) {
        totalPool -= transferAmount;
        balance -= transferAmount;
      }

      accountMap[from] = balance;
      accountMap.total = totalPool;
    }
  }

  let totalRewards = [];
  prevDay = undefined;
  for (let i = 0, len = days.length; i < len; i++) {
    const day = days[i] || prevDay;
    if (!day) {
      continue;
    }
    prevDay = day;

    let totalPool = day.total;
    for (const addr in day) {
      if (addr === 'total') {
        continue;
      }

      const balance = day[addr];
      const share = totalPool > 0n ? ((balance * BigInt(PRECISION)) / (totalPool)) : PRECISION;

      let totalReward = totalRewards.find((e) => e.addr === addr);
      if (!totalReward) {
        totalReward = { reward: 0, share: 0, days: 0, addr: addr };
        totalRewards.push(totalReward);
      }
      totalReward.days++;
      totalReward.share = Number(share);
      totalReward.reward += (MAX_REWARD_DAY / PRECISION) * Number(share);
    }
  }

  // now sort this stuff and render it
  totalRewards = totalRewards.sort((a, b) => b.share - a.share);
  let html = '<p>Rank</p><p>Address</p><p>Current Reward</p><p>Expected Reward</p><p>Pool Share</p>';
  for (let i = 0, len = totalRewards.length; i < len; i++) {
    const { addr, reward, days, share } = totalRewards[i];
    const expectedReward = reward + (((MAX_REWARD_DAY / PRECISION) * share) * (MAX_DAYS - days));
    const highlight = account && addr === account;
    html +=
      `<p>${highlight ? '<bold>🌟' + (i + 1) + '</bold>' : i + 1}.</p><p>${renderAddress(addr)}</p><p>${renderAmount(reward)} HBT</p><p>${renderAmount(expectedReward)} HBT</p><p>${((share / PRECISION) * 100).toFixed(2)}%</p>`;
  }
  document.querySelector('#leaderboard').innerHTML = html;
}

let _reserves;
let _lastUpdate = 0;
async function getReserves () {
  const now = Date.now();
  if (now - _lastUpdate > 30000) {
    _lastUpdate = now;
    const totalSupply = await uniswapPair.totalSupply();
    const { _reserve0, _reserve1 } = await uniswapPair.getReserves();
    _reserves = { totalSupply, _reserve0,_reserve1 };
  }

  return _reserves;
}

async function getPoolShareFor (amount) {
  const { totalSupply, _reserve0 } = await getReserves();
  const amount0 = ethers.utils.parseUnits(amount.toString(), '10')
  const liquidity = amount0.mul(totalSupply).div(_reserve0);
  const share = Number(liquidity.mul(PRECISION).div(totalSupply.add(liquidity)));

  return share;
}

async function render () {
  const description = document.querySelector('#description');
  const grid = document.querySelector('div#data');
  const input = document.querySelector('input#amt');
  input.max = MAX_HBT;

  async function draw () {
    const now = ~~(Date.now() / 1000);

    if (now > END_DATE) {
      document.querySelector('#minting').style.display = 'none';
      document.querySelector('#timeover').style.display = 'block';
      return;
    }

    const amount = Number(input.value);
    const days = ((END_DATE - now) / ONE_DAY_SECONDS);
    const share = await getPoolShareFor(amount);
    const expectedReward = (MAX_REWARD_DAY * (share / PRECISION)) * days;

    document.querySelector('#yieldPercent').textContent = `${((expectedReward / amount) * 100).toFixed(2)}%`;

    description.textContent =
      `You can mine up to ${renderAmount(expectedReward)} HBT by providing ${renderAmount(amount)} HBT for ${days.toFixed(1)} days.`;
    const maxRewardAmount = MAX_REWARD_DAY * MAX_DAYS;
    document.querySelector('#notice').textContent =
      `Note: ${renderAmount(maxRewardAmount)} HBT are provisioned during this timeframe.\n${renderAmount(MAX_REWARD_DAY)} HBT are rewarded to liquidity providers depending on their share after each day.`;
  }

  wrapListener(input, draw, 'keyup');
  draw();
  await update();
  setInterval(update, 5000);
}

window.addEventListener('DOMContentLoaded', render, false);
