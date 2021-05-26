// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';

/// @notice Functionality for Habitat Communities.
contract HabitatCommunity is HabitatBase {
  event CommunityCreated(address indexed governanceToken, bytes32 indexed communityId, string metadata);

  /// @dev Creates a Habitat Community.
  function onCreateCommunity (address msgSender, uint256 nonce, address governanceToken, string calldata metadata) external {
    require(governanceToken != address(0));

    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    bytes32 communityId = HabitatBase._calculateSeed(msgSender, nonce);

    // checks if the community was already created
    require(HabitatBase.tokenOfCommunity(communityId) == address(0));

    // save
    HabitatBase._setStorage(_TOKEN_OF_COMMUNITY_KEY(communityId), governanceToken);
    HabitatBase._setStorage(_MEMBER_OF_COMMUNITY_KEY(communityId, msgSender), 1);
    HabitatBase._incrementStorage(_MEMBERS_TOTAL_COUNT_KEY(communityId));

    emit CommunityCreated(governanceToken, communityId, metadata);
  }
}
