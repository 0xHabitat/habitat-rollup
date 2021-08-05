import { ethers, getSigner, walletIsConnected } from './utils.js';
import {
  onChainUpdate,
  getProviders,
  getDelegatedAmountsForToken,
  getTotalDelegatedAmountForToken,
} from './rollup.js';

export default class BalanceTracker {
  static balances = {};
  static records = {};

  static reset () {
    this.balances = {};
    this.records = {};
  }

  static async getAccount () {
    if (walletIsConnected()) {
      const signer = await getSigner();
      return await signer.getAddress();
    }

    return ethers.constants.AddressZero;
  }

  static record (token, id, v, delegationMode) {
    const key = token.address + (delegationMode ? '1' : '0');
    const records = this.records[key] || [];
    records[id] = v;
    this.records[key] = records;

    window.postMessage(
      {
        type: 'hbt-balance-tracker-update',
        value: {
          tokenAddress: token.address,
          delegationMode: !!delegationMode
        }
      },
      window.location.origin
    );
  }

  static getPending (token, delegationMode) {
    const key = token.address + (delegationMode ? '1' : '0');
    const records = this.records[key] || [];
    let pending = 0;

    for (const k in records) {
      pending += records[k];
    }

    return pending;
  }

  static async stat (token, delegationMode) {
    const account = await this.getAccount();
    const key = token + account + (delegationMode ? '1' : '0');
    let obj = this.balances[key];

    if (!obj) {
      let total;
      let available;

      if (delegationMode) {
        const res = await getDelegatedAmountsForToken(token.address, account);
        total = res.total;
        available = res.total.sub(res.used);
      } else {
        const { habitat } = await getProviders();
        const totalUserBalance = await habitat.callStatic.getBalance(token.address, account);
        const delegated = await getTotalDelegatedAmountForToken(token.address, account);
        const voted = await habitat.callStatic.getActiveVotingStake(token.address, account);

        total = totalUserBalance.sub(delegated);
        available = total.sub(voted);
      }

      obj = { total, available };
      this.balances[key] = obj;
    }

    const total = Number(ethers.utils.formatUnits(obj.total, token.decimals));
    const available = total - this.getPending(token, delegationMode);

    return { total, available };
  }
}

function update () {
  onChainUpdate(update);
  BalanceTracker.reset();
}
update();
