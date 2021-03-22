// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice A Vault holds assets with a custom (contract) condition to unlock them.
contract HabitatAccount is HabitatBase {
  event ClaimUsername(address indexed account, bytes32 indexed shortString);

  /// @dev State transition when a user claims a (short) username.
  function onClaimUsername (address msgSender, uint256 nonce, bytes32 shortString) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(nameToAddress[shortString] == address(0), 'SET');

    nameToAddress[shortString] = msgSender;
    emit ClaimUsername(msgSender, shortString);
  }

  /// @dev State transition when a user sets a delegate.
  function onSetDelegate (address msgSender, uint256 nonce, address delegatee) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    accountDelegate[msgSender] = delegatee;
  }
}
