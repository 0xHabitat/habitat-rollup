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

    bytes32 communityId;
    assembly {
      mstore(0, msgSender)
      mstore (32, nonce)
      let tmp := mload(64)
      mstore(64, governanceToken)
      communityId := keccak256(0, 96)
      mstore(64, tmp)
    }

    // this should actually not happen but check it anyway
    require(HabitatBase.tokenOfCommunity(communityId) == address(0));
    HabitatBase._setTokenOfCommunity(communityId, governanceToken);
    HabitatBase._setIsMemberOfCommunity(communityId, msgSender);
    HabitatBase._incrementTotalMemberCount(communityId);

    emit CommunityCreated(governanceToken, communityId, metadata);
  }
}
