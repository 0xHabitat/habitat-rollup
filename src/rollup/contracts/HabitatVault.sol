// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice A Vault holds assets with a custom (contract) condition to unlock them.
contract HabitatVault is HabitatBase {
  event VaultCreated(bytes32 indexed communityId, address indexed condition, address indexed vaultAddress, string metadata);

  /// @dev Creates a Habitat Vault for a Community.
  function onCreateVault (
    address msgSender,
    uint256 nonce,
    bytes32 communityId,
    address condition,
    string calldata metadata
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // checks if the condition exists
    require(HabitatBase._getStorage(_MODULE_HASH_KEY(condition)) != 0, 'HASH');
    // checks if the community exists
    require(tokenOfCommunity(communityId) != address(0), 'COMMUNITY');
    // checks if the community has this module activated
    // xxx not needed yet
    // require(HabitatBase._getStorage(_ACTIVATOR_OF_MODULE_KEY(communityId, condition)) != 0, 'ACTIVE');

    // generate unique address
    address vaultAddress = HabitatBase._calculateAddress(msgSender, nonce, communityId);
    // checks if the vault already exists
    require(HabitatBase.communityOfVault(vaultAddress) == bytes32(0), 'EXISTS');

    // save
    HabitatBase._setStorage(_COMMUNITY_OF_VAULT_KEY(vaultAddress), communityId);
    HabitatBase._setStorage(_VAULT_CONDITION_KEY(vaultAddress), condition);

    emit VaultCreated(communityId, condition, vaultAddress, metadata);
  }
}
