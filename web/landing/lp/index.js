import {
  wrapListener,
  renderAmount,
  walletIsConnected,
  getSigner,
  getProvider,
  renderAddress,
  getEtherscanLink,
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
const globalReceipts = JSON.parse(localStorage.getItem('greceipts') || '{}');

function calcDailyReward (amount, duration) {
  const rewards = [];
  let cumulative = 0;

  if (amount < MIN_LP_AMOUNT) {
    amount = 0;
  }

  for (let seconds = 0; seconds < duration; seconds += ONE_DAY_SECONDS) {
    const share = (Math.sqrt(amount) * (seconds * seconds)) / MAX_SHARE;
    const r = MAX_REWARD_DAY * share;
    cumulative += r;
    rewards.push(r);
  }

  return { cumulative, rewards };
}

async function update () {
  let account;
  if (walletIsConnected()) {
    const signer = await getSigner();
    account = await signer.getAddress();
  }

  const provider = getProvider();
  const eventFilter = {
    address: UNISWAP_PAIR,
    topics: [[MINT_TOPIC, BURN_TOPIC]],
    fromBlock: `0x${START_BLOCK.toString(16)}`,
    toBlock: 'latest',
  };

  // fetch the mint & burn events and gather timestamps
  const logs = await provider.send('eth_getLogs', [eventFilter]);
  let tmp = [];
  for (const log of logs) {
    const block = globalBlocks[log.blockHash] || await provider.getBlock(log.blockHash);
    globalBlocks[log.blockHash] = block;
    const timestamp = Number(block.timestamp);

    if (timestamp > END_DATE) {
      // done
      break;
    }

    const receipt = globalReceipts[log.transactionHash] || await provider.getTransactionReceipt(log.transactionHash);
    globalReceipts[log.transactionHash] = receipt;
    tmp.push({ log, receipt, timestamp });
  }

  // save/cache
  localStorage.setItem('gblocks', JSON.stringify(globalBlocks));
  localStorage.setItem('greceipts', JSON.stringify(globalReceipts));

  // filter the events and extract the token amounts
  const accountMap = {};
  for (const ele of tmp) {
    const from = ele.receipt.from;
    const timestamp = ele.timestamp;
    let hbtValue;
    for (const log of ele.receipt.logs) {
      // remember the last token transfer
      if (log.topics[0] === TRANSFER_TOPIC && log.address.toLowerCase() === HBT.toLowerCase()) {
        hbtValue = Number(ethers.utils.formatUnits(log.data, '10'));
        continue;
      }
      if (log.address.toLowerCase() !== UNISWAP_PAIR) {
        // skip if target is not the uniswap pair
        continue;
      }
      const isMint = log.topics[0] === MINT_TOPIC;
      const isBurn = log.topics[0] === BURN_TOPIC;
      if (isMint || isBurn) {
        const ary = accountMap[from] || [];
        ary.push({ isMint,isBurn, hbtValue, timestamp });
        accountMap[from] = ary;
      }
    }
  }

  // calculate the average for each user
  const now = ~~(Date.now() / 1000);
  let res = [];
  for (const addr in accountMap) {
    const events = accountMap[addr];
    let liquidity = 0;
    let lastTime = 0;
    let reward = 0;
    for (const evt of events) {
      if (!lastTime) {
        // init
        lastTime = evt.timestamp;
      }
      // calculate the reward since last time
      const snapshot = calcDailyReward(liquidity, evt.timestamp - lastTime).cumulative;
      lastTime = evt.timestamp;
      reward += snapshot;

      if (evt.isMint) {
        liquidity += evt.hbtValue;
      } else {
        liquidity -= evt.hbtValue;
      }
    }
    // calculate remaining reward up to now
    reward += calcDailyReward(liquidity, now - lastTime).cumulative;
    // and the max reward if the liquidity stays in until `END_DATE`
    const maxReward = reward + calcDailyReward(liquidity, END_DATE - now).cumulative;
    res.push({ addr, reward, maxReward, liquidity });
  }

  // now sort this stuff and render it
  res = res.sort((a, b) => b.maxReward - a.maxReward);
  let html = '<p>Rank</p><p>Address</p><p>Current Reward</p><p>Expected Reward</p><p>Liquidity (Average)</p>';
  for (let i = 0, len = res.length; i < len; i++) {
    const { addr, reward, maxReward, liquidity } = res[i];
    const highlight = account && addr === account;
    html +=
      `<p>${highlight ? '<bold>🌟' + (i + 1) + '</bold>' : i + 1}.</p><p>${renderAddress(addr)}</p><p>${renderAmount(reward)} HBT</p><p>${renderAmount(maxReward)} HBT</p><p>${renderAmount(liquidity)} HBT</p>`;
  }
  document.querySelector('#leaderboard').innerHTML = html;
}

async function render () {
  const description = document.querySelector('#description');
  const grid = document.querySelector('div#data');
  const input = document.querySelector('input#amt');
  const canvas = document.querySelector('canvas#graph');
  const ctx = canvas.getContext('2d');
  const scale = window.devicePixelRatio;
  const width = canvas.width;
  const height = canvas.height;

  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.scale(scale, scale);
  input.max = MAX_HBT;

  function draw () {
    const now = ~~(Date.now() / 1000);

    if (now > END_DATE) {
      document.querySelector('#minting').style.display = 'none';
      document.querySelector('#timeover').style.display = 'block';
      return;
    }

    const amount = Number(input.value);
    const duration = END_DATE - now;
    const { rewards, cumulative }= calcDailyReward(amount, duration);
    const len = rewards.length;

    description.textContent =
      `You can mine up to ${renderAmount(cumulative)} HBT by providing ${renderAmount(amount)} HBT for ${(duration / ONE_DAY_SECONDS).toFixed(2)} days.`;
    const maxRewardAmount = MAX_REWARD_DAY * MAX_DAYS;
    document.querySelector('#notice').textContent =
      `Note: ${renderAmount(maxRewardAmount)} HBT are provisioned during this timeframe.\nThe reward amount will be distributed evenly along the top liquidity providers if the collective rewards are higher than this amount.`;

    const gap = width / len;
    const MAX_RELATIVE = rewards[len - 1];
    ctx.clearRect(0, 0, width, height);
    {
      ctx.strokeStyle = '#635BFF';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      let x = 0;
      for (let i = 0; i < len; i++) {
        const r = rewards[i] / MAX_RELATIVE;
        const y = height - (height * r);
        ctx.lineTo(x, y);
        //ctx.arc(x, y, 1, 0, Math.PI * 2);
        x += gap;
      }
      ctx.stroke();
      ctx.closePath();
    }

    /*
    {
      ctx.strokeStyle = '#FBDC60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      let x = 0;
      for (let i = 0; i < len; i++) {
        const r = rewards[i] / MAX_REWARD_DAY;
        const y = height - (height * r);
        ctx.lineTo(x, y);
        x += gap;
      }
      ctx.stroke();
      ctx.closePath();
    }
    */
  }

  wrapListener(input, draw, 'keyup');
  setInterval(update, 5000);
  update();
  draw();
}

window.addEventListener('DOMContentLoaded', render, false);
