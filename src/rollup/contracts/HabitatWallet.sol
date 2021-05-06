// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Functionality for user wallets.
contract HabitatWallet is HabitatBase {
  event TokenTransfer(address indexed token, address indexed from, address indexed to, uint256 value);
  // xxx: add something like a approve function?
  // xxx add total balance of asset

  /// @notice Returns the balance (amount of `token`) for `account`.
  /// Supports ERC-20 and ERC-721 and takes staked balances into account.
  function _getUnstakedBalance (address token, address account) internal view returns (uint256 ret) {
    uint256 staked = HabitatBase.getActiveVotingStake(token, account);
    ret = HabitatBase.getBalance(token, account);
    require(staked <= ret, 'BUG1');
    ret = ret - staked;
  }

  /// @dev State transition when a user transfers a token.
  function _transferToken (address token, address from, address to, uint256 value) internal virtual {
    // xxx check under/overflows
    // take getActiveVotingStake() into account
    if (from != to) {
      bool isERC721 = NutBerryTokenBridge.isERC721(token, value);

      // update from
      if (isERC721) {
        require(HabitatBase.getErc721Owner(token, value) == from, 'OWNER');
        HabitatBase._setErc721Owner(token, value, to);
      }

      uint256 balanceDelta = isERC721 ? 1 : value;
      // both ERC-20 & ERC-721
      {
        // check stake
        // xxx: nfts are currently not separately tracked - probably not needed?
        {
          uint256 unstakedBalance = _getUnstakedBalance(token, from);
          require(unstakedBalance >= balanceDelta, 'STAKE');
        }

        // can throw
        HabitatBase._decrementBalance(token, from, balanceDelta);

        if (to == address(0)) {
          if (isERC721) {
            TokenInventoryBrick._setERC721Exit(token, from, value);
          } else {
            TokenInventoryBrick._incrementExit(token, from, value);
          }
        } else {
          // can throw
          HabitatBase._incrementBalance(token, to, balanceDelta);
        }
      }

      {
        // TVL
        bool fromVault = HabitatBase.vaultCondition(from) != address(0);
        bool toVault = !fromVault && HabitatBase.vaultCondition(to) != address(0);

        // transfer from vault to vault
        // exits (to == 0)
        // transfer from user to vault
        // transfer from vault to user
        if (toVault || !fromVault && to == address(0)) {
          HabitatBase._decrementTotalValueLocked(token, balanceDelta);
        } else if (fromVault) {
          HabitatBase._incrementTotalValueLocked(token, balanceDelta);
        }
      }
    }

    emit TokenTransfer(token, from, to, value);
  }

  /// @dev State transition when a user deposits a token.
  function onDeposit (address token, address owner, uint256 value) external {
    HabitatBase._commonChecks();

    // xxx check under/overflows
    bool isERC721 = NutBerryTokenBridge.isERC721(token, value);
    uint256 incrementBy = isERC721 ? 1 : value;

    if (isERC721) {
      HabitatBase._setErc721Owner(token, value, owner);
    }

    // both ERC-20 and ERC-721
    HabitatBase._incrementBalance(token, owner, incrementBy);

    // TVL
    {
      bool notAVault = HabitatBase.vaultCondition(owner) == address(0);
      if (notAVault) {
        HabitatBase._incrementTotalValueLocked(token, incrementBy);
      }
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
