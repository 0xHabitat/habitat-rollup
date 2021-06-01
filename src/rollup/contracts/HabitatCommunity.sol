// SPDX-License-Identifier: Unlicense
pragma solidity >=0.7.6;

import './HabitatBase.sol';

/// @notice Functionality for Habitat Communities.
// Audit-1: pending
contract HabitatCommunity is HabitatBase {
  event CommunityCreated(address indexed governanceToken, bytes32 indexed communityId, string metadata);

  /// @dev Creates a Habitat Community.
  function onCreateCommunity (address msgSender, uint256 nonce, address governanceToken, string calldata metadata) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    require(governanceToken != address(0), 'OCC1');
    // calculate a deterministic community id
    bytes32 communityId = HabitatBase._calculateSeed(msgSender, nonce);
    // checks if the community was already created
    require(HabitatBase.tokenOfCommunity(communityId) == address(0), 'OCC2');
    // community > token
    HabitatBase._setStorage(_TOKEN_OF_COMMUNITY_KEY(communityId), governanceToken);
    HabitatBase._setStorage(_MEMBER_OF_COMMUNITY_KEY(communityId, msgSender), 1);
    // init total members count
    HabitatBase._setStorage(_MEMBERS_TOTAL_COUNT_KEY(communityId), 1);

    if (_shouldEmitEvents()) {
      emit CommunityCreated(governanceToken, communityId, metadata);
    }
  }
}
