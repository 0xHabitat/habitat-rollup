// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './HabitatBase.sol';
import './HabitatWallet.sol';

/// @notice Takes care of transferring value to a operator minus a few that goes to the staking pool.
// Audit-1: pending
contract HabitatStakingPool is HabitatBase, HabitatWallet {
  event ClaimedStakingReward(address indexed account, address indexed token, uint256 amount);

  function _specialLoad (uint256 oldValue, uint256 key) internal returns (uint256) {
    uint256 newValue = HabitatBase._getStorage(key);

    // a zero slot means no change and -1 means drained
    if (newValue == uint256(1)) {
      return 0;
    }
    if (newValue == 0) {
      return oldValue;
    }
    return newValue;
  }

  /// @notice Claims staking rewards for `epoch`.
  function onClaimStakingReward (address msgSender, uint256 nonce, address token) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    uint256 currentEpoch = getCurrentEpoch();
    uint256 nextClaimableEpoch = HabitatBase._getStorage(_STAKING_EPOCH_LAST_CLAIMED_KEY(token, msgSender)) + 1;
    // checks if the account can claim rewards
    require(currentEpoch > nextClaimableEpoch, 'OCSR1');
    // update
    HabitatBase._setStorage(_STAKING_EPOCH_LAST_CLAIMED_KEY(token, msgSender), currentEpoch);

    uint256 historicTotalUserBalance;
    uint256 historicTVL;
    /// xxx cap loop
    for (uint256 epoch = nextClaimableEpoch; epoch < currentEpoch; epoch++) {
      uint256 reward = 0;
      // special pool address
      address pool = address(epoch);
      uint256 poolBalance = getBalance(token, pool);

      /// xxx get final pool balance
      if (poolBalance > 0) {
        historicTVL = _specialLoad(historicTVL, _STAKING_EPOCH_TVL_KEY(epoch, token));
        historicTotalUserBalance = _specialLoad(historicTotalUserBalance, _STAKING_EPOCH_TUB_KEY(epoch, token, msgSender));
        // xxx bounds checking
        reward = poolBalance / (historicTVL / historicTotalUserBalance);
        // xxx transfer dust?
        _transferToken(token, pool, msgSender, reward);
      }

      if (_shouldEmitEvents()) {
        emit ClaimedStakingReward(msgSender, token, reward);
      }
    }
  }

  /// @notice Transfers funds to a (trusted) operator. A fraction `STAKING_POOL_FEE_DIVISOR` of the funds goes to the staking pool.
  function onTributeForOperator (
    address msgSender,
    uint256 nonce,
    address operator,
    address token,
    uint256 amount
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    uint256 fee = amount / STAKING_POOL_FEE_DIVISOR();
    uint256 currentEpoch = getCurrentEpoch();
    address pool = address(currentEpoch);
    _transferToken(token, msgSender, pool, fee);
    _transferToken(token, msgSender, operator, amount - fee);
  }
}
