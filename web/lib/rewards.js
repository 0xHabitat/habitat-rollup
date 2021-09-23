import {
  getSigner,
  getToken,
  getConfig,
  ethers,
} from './utils.js';
import {
  getProviders,
  doQueryWithOptions
} from './rollup.js';

export async function calculateRewards (token) {
  const { habitat } = await getProviders();
  const signer = await getSigner();
  const account = await signer.getAddress();
  const currentEpoch = Number(await habitat.callStatic.getCurrentEpoch());
  const currentPoolBalance =
    BigInt(await habitat.callStatic.getBalance(token.address, `0x${currentEpoch.toString(16).padStart(40, '0')}`));
  let totalRewards = BigInt(0);
  let lastClaimedEpoch = 0;

  {
    const logs = await doQueryWithOptions({ toBlock: 1 }, 'ClaimedStakingReward', account, token.address);
    for (const log of logs) {
      if (lastClaimedEpoch === 0) {
        lastClaimedEpoch = Number(log.args.epoch) + 1;
      }
      totalRewards += BigInt(log.args.amount);
    }
  }

  if (lastClaimedEpoch === 0) {
    // first token transfer to account
    const logs = await doQueryWithOptions({ fromBlock: 1, maxResults: 1 }, 'TokenTransfer', token.address, null, account);
    if (logs.length) {
      lastClaimedEpoch = Number(logs[0].args.epoch);
    } else {
      lastClaimedEpoch = currentEpoch;
    }
  }

  async function getTub (oldValue, epoch) {
    const newValue = await habitat.callStatic.getHistoricTub(token.address, account, epoch);

    // 0 means no record / no change
    if (newValue.eq(0)) {
      return oldValue;
    }

    // -1 means drained (no balance)
    if (newValue.eq(ethers.constants.MaxUint256)) {
      return ethers.BigNumber.from(0);
    }

    // default to newValue
    return newValue;
  }

  const secondsPerEpoch = Number(await habitat.callStatic.SECONDS_PER_EPOCH());
  const epochGenesis = Number(await habitat.callStatic.EPOCH_GENESIS());
  const dateNow = ~~(Date.now() / 1000);
  const secondsUntilNextEpoch = (epochGenesis + (currentEpoch * secondsPerEpoch)) - dateNow;
  let claimable = BigInt(0);
  let outstanding = BigInt(0);
  let sinceEpoch = 0;
  let rewards = [];
  let historicUserBalance = ethers.BigNumber.from(0);
  for (let epoch = lastClaimedEpoch; epoch <= currentEpoch; epoch++) {
    historicUserBalance = await getTub(historicUserBalance, epoch);

    const poolAddr = '0x' + epoch.toString(16).padStart(40, '0');
    const historicPoolBalance = await habitat.callStatic.getHistoricTub(token.address, poolAddr, epoch);
    if (historicPoolBalance.lt(1) || historicPoolBalance.eq(ethers.constants.MaxUint256)) {
      continue;
    }
    const historicTvl = await habitat.callStatic.getHistoricTvl(token.address, epoch);
    const tvl = historicTvl.sub(historicPoolBalance);
    const timestamp = (epochGenesis + (epoch * secondsPerEpoch)) - dateNow;

    let reward = BigInt(0);
    if (tvl.gt(0) && historicUserBalance.gt(0)) {
      const divisor = tvl.div(historicUserBalance);
      if (divisor.gt(0)) {
        reward = BigInt(historicPoolBalance.div(divisor));
      }
    }
    if (!sinceEpoch) {
      sinceEpoch = epoch;
    }

    if (epoch === currentEpoch) {
      outstanding = reward;
    } else {
      claimable += reward;
    }

    rewards.push({ epoch, reward, timestamp, poolBalance: BigInt(historicPoolBalance) });
  }

  const PRECISION = 10000n;
  const currentStake = BigInt(await habitat.callStatic.getBalance(token.address, account));
  const currentTVL = BigInt(await habitat.callStatic.getTotalValueLocked(token.address));
  const currentPoolShare = currentTVL > 0n ? (currentStake * PRECISION) / currentTVL : 0n;
  let averagePoolBalance = 0n;
  if (rewards.length) {
    for (const o of rewards) {
      averagePoolBalance += o.poolBalance;
    }
    averagePoolBalance /= BigInt(rewards.length);
  }
  const estimatedYieldEpoch = (averagePoolBalance / PRECISION) * currentPoolShare;
  return {
    claimable,
    outstanding,
    currentEpoch,
    currentPoolBalance,
    sinceEpoch,
    secondsUntilNextEpoch,
    rewards,
    currentStake,
    estimatedYieldEpoch,
    currentPoolShare: currentPoolShare,
    poolShareDivider: PRECISION,
  };
}

export async function calculateLiquidityRewards (token, account) {
  function updateValue (oldValue, newValue) {
    const BIG_ZERO = BigInt(0);
    const BIG_MAX = BigInt.asUintN(256, '-1');

    // 0 means no record / no change
    if (newValue === BIG_ZERO) {
      return oldValue;
    }

    // -1 means drained (no balance)
    if (newValue === BIG_MAX) {
      return BIG_ZERO;
    }

    // default to newValue
    return newValue;
  }

  const START_EPOCH = 12;
  const END_EPOCH = 27;
  const PRECISION = BigInt(10n ** 18n);
  const EMISSION_PER_EPOCH = BigInt(156250000000000) * PRECISION;

  const { habitat } = await getProviders();
  const currentEpoch = Number(await habitat.callStatic.getCurrentEpoch());
  const secondsPerEpoch = Number(await habitat.callStatic.SECONDS_PER_EPOCH());
  const epochGenesis = Number(await habitat.callStatic.EPOCH_GENESIS());
  const dateNow = ~~(Date.now() / 1000);
  let rewards = [];
  let historicUserBalance = BigInt(0);
  let tvl = BigInt(0);

  for (let epoch = START_EPOCH; epoch <= Math.min(END_EPOCH, currentEpoch); epoch++) {
    tvl = BigInt(await habitat.callStatic.getHistoricTvl(token.address, epoch)) || tvl;

    historicUserBalance = updateValue(
      historicUserBalance,
      BigInt(await habitat.callStatic.getHistoricTub(token.address, account, epoch))
    );

    let reward = BigInt(0);
    if (tvl && historicUserBalance) {
      const divisor = (tvl * PRECISION) / historicUserBalance;
      if (divisor) {
        reward = EMISSION_PER_EPOCH / divisor;
      }
    }

    const timestamp = (epochGenesis + (epoch * secondsPerEpoch)) - dateNow;
    rewards.push({ epoch, reward, timestamp });
  }

  const currentStake = BigInt(await habitat.callStatic.getBalance(token.address, account));
  const currentTVL = BigInt(await habitat.callStatic.getTotalValueLocked(token.address));
  const currentPoolShare = currentTVL > BigInt(0) ? (currentStake * PRECISION) / currentTVL : BigInt(0);
  return {
    currentEpoch,
    currentStake,
    currentPoolShare: currentPoolShare,
    poolShareDivider: PRECISION,
    rewards,
  };
}
