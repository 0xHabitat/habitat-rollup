// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import '@NutBerry/rollup-bricks/src/tsm/contracts/TokenBridgeBrick.sol';
import '@NutBerry/rollup-bricks/src/bricked/contracts/UtilityBrick.sol';

/// @notice Global state and public utiltiy functions for the Habitat Rollup
contract HabitatBase is TokenBridgeBrick, UtilityBrick {
  // xxx: implement storage getters and setters manually with fixed storage keys
  // xxx: default community voting condition?

  // global habitat rollup related state
  mapping (uint256 => bytes32) public executionPermits;
  mapping (address => uint256) public txNonces;
  // social features
  mapping (bytes32 => address) public nameToAddress;
  mapping (address => address) public accountDelegate;
  // communities
  mapping (bytes32 => address) public tokenOfCommunity;
  mapping (address => bytes32) public communityOfVault;
  // modules
  mapping (address => bytes32) public moduleHash;
  mapping (bytes32 => mapping (address => uint256)) public activeModule;
  // tracks proposalId > startDate
  mapping (bytes32 => uint256) proposalStartDate;
  // tracks proposalId > vault
  mapping (bytes32 => address) proposalVault;

  // token balances
  mapping (address => mapping(address => uint256)) public erc20;
  mapping (address => mapping(uint256 => address)) public erc721;

  function _commonChecks () internal {
    // all power the core protocol
    require(msg.sender == address(this));
  }

  function _checkUpdateNonce (address msgSender, uint256 nonce) internal {
    require(nonce == txNonces[msgSender], 'NONCE');

    txNonces[msgSender] = nonce + 1;
  }

  function INSPECTION_PERIOD () public view virtual override returns (uint16) {
    // ~84 hours
    return 21600;
  }

  function PROPOSAL_DELAY () public view virtual returns (uint256) {
    return 3600 * 32;
  }

  function _ERC20_KEY (address tkn, address account) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0x24de14bddef9089376483557827abada7f1c6135d6d379c3519e56e7bc9067b9)
      mstore(32, tkn)
      let tmp := mload(64)
      mstore(64, account)
      ret := keccak256(0, 96)
      mstore(64, tmp)
    }
  }

  function getErc20Balance (address tkn, address account) public virtual view returns (uint256 ret) {
    uint256 key = _ERC20_KEY(tkn, account);
    assembly {
      ret := sload(key)
    }
  }

  function _setErc20Balance (address tkn, address account, uint256 amount) internal {
    uint256 key = _ERC20_KEY(tkn, account);
    assembly {
      sstore(key, amount)
    }
  }

  function _VOTING_SHARES_KEY (bytes32 proposalId, address account) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0x24ce236379086842ae19f4302972c7dd31f4c5054826cd3e431fd503205f3b67)
      mstore(32, proposalId)
      let tmp := mload(64)
      mstore(64, account)
      ret := keccak256(0, 96)
      mstore(64, tmp)
    }
  }

  function getVote (bytes32 proposalId, address account) public view returns (uint256 ret) {
    uint256 key = _VOTING_SHARES_KEY(proposalId, account);
    assembly {
      ret := sload(key)
    }
  }

  function _setVote (bytes32 proposalId, address account, uint256 shares) internal {
    uint256 key = _VOTING_SHARES_KEY(proposalId, account);
    assembly {
      sstore(key, shares)
    }
  }

  function _VOTING_COUNT_KEY (bytes32 proposalId) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0x637730e93bbd8200299f72f559c841dfae36a36f86ace777eac8fe48f977a46d)
      mstore(32, proposalId)
      ret := keccak256(0, 64)
    }
  }

  function getVoteCount (bytes32 proposalId) public view returns (uint256 ret) {
    uint256 key = _VOTING_COUNT_KEY(proposalId);
    assembly {
      ret := sload(key)
    }
  }

  function _incrementVoteCount (bytes32 proposalId) internal {
    uint256 key = _VOTING_COUNT_KEY(proposalId);
    assembly {
      sstore(key, add(sload(key), 1))
    }
  }

  function _VOTING_TOTAL_SHARE_KEY (bytes32 proposalId) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0x847f5cbc41e438ef8193df4d65950ec6de3a1197e7324bffd84284b7940b2d4a)
      mstore(32, proposalId)
      ret := keccak256(0, 64)
    }
  }

  function getTotalVotingShares (bytes32 proposalId) public view returns (uint256 ret) {
    uint256 key = _VOTING_TOTAL_SHARE_KEY(proposalId);
    assembly {
      ret := sload(key)
    }
  }

  function _setTotalVotingShares (bytes32 proposalId, uint256 val) internal {
    uint256 key = _VOTING_TOTAL_SHARE_KEY(proposalId);
    assembly {
      sstore(key, val)
    }
  }

  function _MEMBER_OF_COMMUNITY_KEY (bytes32 communityId, address account) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0x0ff6c2ccfae404e7ec55109209ac7c793d30e6818af453a7c519ca59596ccde1)
      mstore(32, communityId)
      let tmp := mload(64)
      mstore(64, account)
      ret := keccak256(0, 96)
      mstore(64, tmp)
    }
  }

  function getIsMemberOfCommunity (bytes32 communityId, address account) public view returns (bool ret) {
    uint256 key = _MEMBER_OF_COMMUNITY_KEY(communityId, account);
    assembly {
      ret := sload(key)
    }
  }

  function _setIsMemberOfCommunity (bytes32 communityId, address account) internal {
    uint256 key = _MEMBER_OF_COMMUNITY_KEY(communityId, account);
    assembly {
      sstore(key, 1)
    }
  }

  function _MEMBERS_TOTAL_COUNT_KEY (bytes32 communityId) internal view returns (uint256 ret) {
    assembly {
      mstore(0, 0xe1338c6a5be626513cff1cb54a827862ae2ab4810a79c8dfd1725e69363f4247)
      mstore(32, communityId)
      ret := keccak256(0, 64)
    }
  }

  function getTotalMemberCount (bytes32 communityId) public view returns (uint256 ret) {
    uint256 key = _MEMBERS_TOTAL_COUNT_KEY(communityId);
    assembly {
      ret := sload(key)
    }
  }

  function _incrementTotalMemberCount (bytes32 communityId) internal returns (uint256 ret) {
    uint256 key = _MEMBERS_TOTAL_COUNT_KEY(communityId);
    assembly {
      ret := add(sload(key), 1)
      sstore(key, ret)
    }
  }


  function _maybeUpdateMemberCount (bytes32 proposalId, address account) internal {
    address vault = proposalVault[proposalId];
    bytes32 communityId = communityOfVault[vault];
    if (!getIsMemberOfCommunity(communityId, account)) {
      _setIsMemberOfCommunity(communityId, account);
      _incrementTotalMemberCount(communityId);
    }
  }
}
