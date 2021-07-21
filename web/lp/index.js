import {
  wrapListener,
  renderAmount,
  walletIsConnected,
  getSigner,
  getProvider,
  renderAddress,
  getEtherscanLink,
  secondsToString,
  getConfig,
  ethers,
} from '/lib/utils.js';
const {
  HBT,
} = getConfig();

const UINT256_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';
const UNISWAP_PAIR = '0xc7a1cb6edc22e94f17c80eb5b959f2ad28511d4e';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const START_BLOCK = 12_010_274;
const PRECISION = 10000;

// seconds
const ONE_DAY_SECONDS = 3600 * 24;
const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;
// first const MAX_SECONDS = ONE_WEEK_SECONDS * 12;
const MAX_SECONDS = ONE_WEEK_SECONDS * 4;
const MAX_DAYS = MAX_SECONDS / ONE_DAY_SECONDS;
const MAX_HBT = 2_000_000;
const MAX_SHARE = Math.sqrt(MAX_HBT) * (MAX_SECONDS * MAX_SECONDS);
// first const MAX_REWARD_DAY = 2143;
const MAX_REWARD_DAY = 714.2857142857143;
// first const START_DATE = 1615372251;
const START_DATE = 1622630070;
const END_DATE = START_DATE + MAX_SECONDS;

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
    try {
      const signer = await getSigner();
      account = (await signer.getAddress()).toLowerCase();
    } catch (e) {}
  }

  const slider = document.querySelector('#progress habitat-slider');
  const todo = [];
  {
    // fetch transfer events of the uniswap pair and gather timestamps
    const eventFilter = {
      address: UNISWAP_PAIR,
      topics: [TRANSFER_TOPIC],
      fromBlock: `0x${START_BLOCK.toString(16)}`,
      toBlock: 'latest',
    };
    const logs = await provider.send('eth_getLogs', [eventFilter]);
    for (let i = 0, len = logs.length; i < len; i++) {
      slider.setRange(i, i, len);

      const log = logs[i];
      const { timestamp } = globalBlocks[log.blockHash] || await provider.getBlock(log.blockHash);
      globalBlocks[log.blockHash] = { timestamp };

      if (timestamp > END_DATE) {
        // done
        break;
      }
      todo.push({ timestamp, topics: log.topics, data: log.data });
    }
  }

  slider.parentElement.style.display = 'none';

  // save/cache
  localStorage.setItem('gblocks', JSON.stringify(globalBlocks));

  // go through the events and keep track of pool shares for each day
  const days = [];
  let prevDay = {};
  let totalPool = BigInt(0);
  for (const { timestamp, topics, data } of todo) {
    const day = ~~((timestamp - START_DATE) / ONE_DAY_SECONDS);
    const accountMap = days[day] || Object.assign({}, prevDay);
    prevDay = accountMap;
    days[day] = accountMap;

    const isMint = topics[1] === UINT256_ZERO;
    const isBurn = topics[2] === UINT256_ZERO;
    const from = `0x${(topics[1]).slice(-40)}`;
    const to = `0x${(topics[2]).slice(-40)}`;
    const transferAmount = BigInt(data);

    if (!isMint) {
      accountMap[from] = (accountMap[from] || BigInt(0)) - transferAmount;
    }
    if (!isBurn) {
      accountMap[to] = (accountMap[to] || BigInt(0)) + transferAmount;
    }

    if (isBurn) {
      totalPool -= transferAmount;
    } else if (isMint) {
      totalPool += transferAmount;
    }
    accountMap.total = totalPool;
  }

  const now = ~~(Date.now() / 1000);
  const remainingDays = END_DATE > now ? Math.ceil((END_DATE - now) / ONE_DAY_SECONDS) : 0;
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
        totalReward = { reward: 0, share: 0, days: 0, expectedReward: 0, addr: addr };
        totalRewards.push(totalReward);
      }
      totalReward.days++;
      totalReward.share = Number(share);
      totalReward.reward += (MAX_REWARD_DAY / PRECISION) * Number(share);
    }
  }

  for (let i = 0, len = totalRewards.length; i < len; i++) {
    const obj = totalRewards[i];
    obj.expectedReward = obj.reward + (((MAX_REWARD_DAY / PRECISION) * obj.share) * remainingDays);
  }

  // now sort this stuff and render it
  totalRewards = totalRewards.sort((a, b) => (b.expectedReward - a.expectedReward));
  let html = '<p>Rank</p><p>Address</p><p>Current Reward</p><p>Expected Reward</p><p>Pool Share</p>';
  let csv = 'rank,address,poolShare,reward\n';
  for (let i = 0, len = totalRewards.length; i < len; i++) {
    const { addr, reward, share, expectedReward } = totalRewards[i];
    const highlight = account && addr === account;
    const poolShare = ((share / PRECISION) * 100).toFixed(2);
    html +=
      `<p>${highlight ? '<bold><emoji-glowing-star></emoji-glowing-star><span>' + (i + 1) + '</span></bold>' : i + 1}.</p><p>${renderAddress(addr)}</p><p>${renderAmount(reward)} HBT</p><p>${renderAmount(expectedReward)} HBT</p><p>${poolShare}%</p>`;
    csv += `${i + 1},${addr},${poolShare},${reward}\n`;
  }
  document.querySelector('#leaderboard').innerHTML = html;
  const exportButton = document.querySelector('#export');
  exportButton.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  exportButton.style.visibility = 'visible';
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
