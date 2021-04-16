// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice A Vault holds assets with a custom (contract) condition to unlock them.
contract HabitatVault is HabitatBase {
  event VaultCreated(bytes32 indexed communityId, address indexed condition, address indexed vaultAddress, string metadata);

  /// @dev Creates a Habitat Vault for a Community.
  function onCreateVault (address msgSender, uint256 nonce, bytes32 communityId, address condition, string calldata metadata) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // xxx: generate unique address
    address vaultAddress;
    assembly {
      mstore(0, communityId)
      mstore(32, condition)
      let backup := mload(64)
      mstore(64, msgSender)
      mstore(96, nonce)
      // restore
      mstore(64, backup)
      mstore(96, 0)
      vaultAddress := shr(96, keccak256(0, 128))
    }

    require(tokenOfCommunity(communityId) != address(0));
    HabitatBase._setCommunityOfVault(vaultAddress, communityId);
    // xxx:
    // save
    // vaultsOfCommunity[communityId] = vaultAddress;
    //
    // check if `condition` is activated for `communityId`
    HabitatBase._setVaultCondition(vaultAddress, condition);

    emit VaultCreated(communityId, condition, vaultAddress, metadata);
  }
}
