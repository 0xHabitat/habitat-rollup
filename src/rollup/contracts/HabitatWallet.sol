// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Functionality for user wallets.
contract HabitatWallet is HabitatBase {
  // xxx: add something like a approve function?

  event TokenTransfer(address indexed token, address indexed from, address indexed to, uint256 value);

  /// @dev State transition when a user deposits a token.
  function onDeposit (address token, address owner, uint256 value) external {
    HabitatBase._commonChecks();

    // xxx check under/overflows
    if (TokenBridgeBrick.isERC721(token, value)) {
      erc721[token][value] = owner;
    } else {
      erc20[token][owner] += value;
    }
  }

  /// @dev State transition when a user transfers a token.
  function onTransferToken (address msgSender, uint256 nonce, address token, address to, uint256 value) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // xxx check under/overflows
    if (msgSender != to) {
      if (TokenBridgeBrick.isERC721(token, value)) {
        require(erc721[token][value] == msgSender, 'OWNER');
        erc721[token][value] = to;
      } else {
        erc20[token][msgSender] -= value;
        erc20[token][to] += value;
      }
    }

    emit TokenTransfer(token, msgSender, to, value);
  }

  /// @dev State transition when a user exits a token.
  function onExitToken (address msgSender, uint256 nonce, address token, address to, uint256 value) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // xxx check under/overflows
    if (TokenBridgeBrick.isERC721(token, value)) {
      require(erc721[token][value] == msgSender, 'OWNER');
      TokenInventoryBrick._setERC721Exit(token, to, value);
    } else {
      erc20[token][msgSender] -= value;
      TokenInventoryBrick._incrementExit(token, to, value);
    }
  }
}
