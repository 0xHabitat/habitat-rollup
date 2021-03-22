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
  mapping (bytes32 => address) public vaultsOfCommunity;
  // modules
  mapping (address => bytes32) public moduleHash;
  mapping (bytes32 => mapping (address => uint256)) public activeModule;
  // tracks proposalId > vault > startDate
  mapping (bytes32 => mapping (address => uint256)) proposal;

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
}
