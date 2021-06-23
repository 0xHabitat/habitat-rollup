// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './HabitatV1Challenge.sol';
import './HabitatBase.sol';
import './HabitatAccount.sol';
import './HabitatWallet.sol';
import './HabitatCommunity.sol';
import './HabitatVault.sol';
import './HabitatVoting.sol';
import './HabitatModule.sol';
import './HabitatStakingPool.sol';

/// @notice Composition of the full Habitat Rollup contracts (v1)
// Audit-1: ok
contract HabitatV1 is
  HabitatBase,
  HabitatAccount,
  HabitatWallet,
  HabitatCommunity,
  HabitatVault,
  HabitatVoting,
  HabitatModule,
  HabitatStakingPool,
  HabitatV1Challenge
{
}
