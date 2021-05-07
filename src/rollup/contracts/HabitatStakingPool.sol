// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';
import './HabitatWallet.sol';

/// @notice Takes care of transferring value to a operator minus a few that goes to the staking pool.
/// ### Parameters
///
/// `STAKING_POOL_TOKEN` - The address of the staking token (xHBT).
///
/// `STAKING_POOL_FEE_DIVISOR` - transfer `N` xHBT to the operator (gas) then `N  / STAKING_POOL_FEE_DIVISOR` parts of the operator tribute goes to the staking pool.
///
/// ### Staking on Habitat
///
/// Users can vote (`stake`) xHBT on proposals in the (Official) Habitat Community - xHBT will be the official governance token of the Habitat Community.
/// To claim a percentage of the accumulated amount in the staking pool, a user unstakes (removes voting power) from a proposal.
/// The act of `unstaking` also unlocks the amount of xHBT that can be transferred again.
///
contract HabitatStakingPool is HabitatBase, HabitatWallet {
  /// @notice The address of a ERC-20 token that is used for staking.
  function STAKING_POOL_TOKEN () public view virtual returns (address) {
  }

  /// @notice The divisor for every tribute. A fraction of the operator tribute always goes into the staking pool.
  function STAKING_POOL_FEE_DIVISOR () public view virtual returns (uint256) {
  }

  /// @notice Transfers funds to a (trusted) operator. A fraction of the funds goes to the staking pool.
  function onTributeForOperator (
    address msgSender,
    uint256 nonce,
    address operator,
    uint256 amount
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    uint256 fee = amount / STAKING_POOL_FEE_DIVISOR();
    address token = STAKING_POOL_TOKEN();
    // xxx reserve 'special' addresses or should we substitute the vault logic to implement a 'pool'?
    address pool;
    _transferToken(token, msgSender, pool, fee);
    _transferToken(token, msgSender, operator, amount - fee);
  }
}
