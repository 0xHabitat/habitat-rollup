// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Functionality for user wallets.
contract HabitatWallet is HabitatBase {
  event TokenTransfer(address indexed token, address indexed from, address indexed to, uint256 value);
  // xxx: add something like a approve function?
  // xxx add total balance of asset

  /// @dev State transition when a user transfers a token.
  function _transferToken (address token, address from, address to, uint256 value) internal virtual {
    // xxx check under/overflows
    if (from != to) {
      if (TokenBridgeBrick.isERC721(token, value)) {
        require(HabitatBase.getErc721Owner(token, value) == from, 'OWNER');
        HabitatBase._setErc721Owner(token, value, to);
        if (to == address(0)) {
          TokenInventoryBrick._setERC721Exit(token, from, value);
        }
      } else {
        uint256 tmp = HabitatBase.getErc20Balance(token, from);
        require (tmp >= value);
        HabitatBase._setErc20Balance(token, from, tmp - value);

        if (to == address(0)) {
          TokenInventoryBrick._incrementExit(token, from, value);
        } else {
          tmp = HabitatBase.getErc20Balance(token, to);
          require(tmp + value > tmp);
          HabitatBase._setErc20Balance(token, to, tmp + value);
        }
      }
    }

    emit TokenTransfer(token, from, to, value);
  }

  /// @dev State transition when a user deposits a token.
  function onDeposit (address token, address owner, uint256 value) external {
    HabitatBase._commonChecks();

    // xxx check under/overflows
    if (TokenBridgeBrick.isERC721(token, value)) {
      HabitatBase._setErc721Owner(token, value, owner);
    } else {
      uint256 oldBalance = HabitatBase.getErc20Balance(token, owner);
      uint256 newBalance = oldBalance + value;
      require(newBalance >= oldBalance);

      HabitatBase._setErc20Balance(token, owner, newBalance);
    }

    emit TokenTransfer(token, address(0), owner, value);
  }

  /// @dev State transition when a user transfers a token.
  function onTransferToken (address msgSender, uint256 nonce, address token, address to, uint256 value) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);
    _transferToken(token, msgSender, to, value);
  }
}
