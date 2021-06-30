import {
  getSigner,
  getToken,
  getConfig
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

  let claimable = BigInt(0);
  let outstanding = BigInt(0);
  let sinceEpoch = 0;
  let rewards = [];
  for (let epoch = lastClaimedEpoch; epoch <= currentEpoch; epoch++) {
    const poolAddr = '0x' + epoch.toString(16).padStart(40, '0');
    const historicPoolBalance = await habitat.callStatic.getHistoricTub(token.address, poolAddr, epoch);
    if (historicPoolBalance.lt(1)) {
      continue;
    }
    const historicUserBalance = await habitat.callStatic.getHistoricTub(token.address, account, epoch);
    const historicTvl = await habitat.callStatic.getHistoricTvl(token.address, epoch);
    const tvl = historicTvl.sub(historicPoolBalance);

    let reward = BigInt(0);
    if (tvl.gt(0) && historicUserBalance.gt(0)) {
      reward = BigInt(historicPoolBalance.div(tvl.div(historicUserBalance)));
    }
    if (!reward) {
      continue;
    }
    if (!sinceEpoch) {
      sinceEpoch = epoch;
    }

    if (epoch === currentEpoch) {
      outstanding = reward;
    } else {
      claimable += reward;
    }

    rewards.push({ epoch, reward });
  }

  const secondsPerEpoch = Number(await habitat.callStatic.SECONDS_PER_EPOCH());
  const epochGenesis = Number(await habitat.callStatic.EPOCH_GENESIS());
  const secondsUntilNextEpoch = (epochGenesis + (currentEpoch * secondsPerEpoch)) - ~~(Date.now() / 1000);

  return { claimable, outstanding, currentEpoch, sinceEpoch, secondsUntilNextEpoch, rewards };
}
