// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.6.2;

import './GovBrickChallenge.sol';
import './Moloch.sol';

/// @dev A contract that uses rollup bricks.
contract GovBrick is GovBrickChallenge, Moloch {
  /// @dev State transition when a user deposits a token.
  function onDeposit (address token, address owner, uint256 value) external {
    // all power the core protocol
    require(msg.sender == address(this));

    // only our approved token
    // TODO: if it is a wrong token, then make it available for exit.
    require(token == address(approvedToken), 'wrong token');

    Member storage member = members[owner];

    if (member.exists) {
      uint256 oldValue = members[owner].shares;
      uint256 newValue = oldValue + value;

      require(oldValue + value > oldValue, 'overflow');

      members[owner].shares = newValue;
    } else {
      members[owner] = Member(owner, value, true, 0);
      memberAddressByDelegateKey[owner] = owner;
    }

    // update
    totalShares += value;
  }

  function onInitMoloch (
    address msgSender,
    uint256 nonce,
    address summoner,
    address approvedToken,
    uint256 periodDuration,
    uint256 votingPeriod,
    uint256 gracePeriod,
    uint256 abortWindow,
    uint256 proposalDeposit,
    uint256 dilutionBound,
    uint256 processingReward,
    uint256 summoningTime
  ) external {
    require(msg.sender == address(this));

    _checkUpdateNonce(msgSender, nonce);
    Moloch.initMoloch(
      summoner,
      approvedToken,
      periodDuration,
      votingPeriod,
      gracePeriod,
      abortWindow,
      proposalDeposit,
      dilutionBound,
      processingReward,
      summoningTime
    );
  }

  function onSubmitProposal (
    address msgSender,
    uint256 nonce,
    uint256 startingPeriod,
    string memory details
  ) external {
    // all power the core protocol
    require(msg.sender == address(this));

    _checkUpdateNonce(msgSender, nonce);
    Moloch.submitProposal(msgSender, startingPeriod, details);
  }

  function onSubmitVote (address msgSender, uint256 proposalIndex, uint8 uintVote) external {
    require(msg.sender == address(this));

    Moloch.submitVote(msgSender, proposalIndex, uintVote);
  }

  function onProcessProposal (address msgSender, uint256 proposalIndex) external {
    require(msg.sender == address(this));

    Moloch.processProposal(msgSender, proposalIndex);
  }

  function onRagequit (address msgSender, uint256 nonce, uint256 sharesToBurn) external {
    require(msg.sender == address(this));

    _checkUpdateNonce(msgSender, nonce);
    Moloch.ragequit(msgSender, sharesToBurn);
    // if ragequit did not revert, then increment the exit allowance
    _incrementExit(address(approvedToken), msgSender, sharesToBurn);
  }

  function onAbort (address msgSender, uint256 proposalIndex) external {
    require(msg.sender == address(this));

    Moloch.abort(msgSender, proposalIndex);
  }

  function onUpdateDelegateKey (address msgSender, uint256 nonce, address newDelegateKey) external {
    require(msg.sender == address(this));

    _checkUpdateNonce(msgSender, nonce);
    Moloch.updateDelegateKey(msgSender, newDelegateKey);
  }

  /// @dev Challenge the lowest pending block.
  function onChallenge () external returns (uint256) {
    // returns automatically
    GovBrickChallenge._onChallenge(challengeOffset);
  }

  /// @dev Finalize solution and move to the next block.
  /// Calldata contains a blob of key:value pairs that we are going to apply.
  /// If this functions reverts, then the block can only be finalised by a call to `challenge`.
  function onFinalizeSolution (uint256 blockNumber, bytes32 hash) external {
    UtilityBrick._onFinalizeSolution(blockNumber, hash);
  }
}
