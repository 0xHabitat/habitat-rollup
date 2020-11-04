// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './GovBrickChallenge.sol';
import './Moloch.sol';

/// @dev A contract that uses rollup bricks.
contract GovBrick is GovBrickChallenge, Moloch {
  /// @dev State transition when a user deposits a token.
  function onDeposit (address token, address owner, uint256 value) external {
    // all power the core protocol
    require(msg.sender == address(this));

    // if it's a wrong token, then make it available for exit.
    // But if this is a ERC-721 then this will lead to wrong exit values, dont care in this case.
    if (token != address(approvedToken)) {
      _incrementExit(token, owner, value);
      return;
    }

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
    uint256 dilutionBound,
    uint256 summoningTime
  ) external {
    _commonChecks();
    _checkUpdateNonce(msgSender, nonce);
    Moloch.initMoloch(
      summoner,
      approvedToken,
      periodDuration,
      votingPeriod,
      gracePeriod,
      abortWindow,
      dilutionBound,
      summoningTime
    );
  }

  function onSubmitProposal (
    address msgSender,
    uint256 nonce,
    uint256 startingPeriod,
    string memory title,
    string memory details,
    bytes memory actions
  ) external {
    _commonChecks();
    _checkUpdateNonce(msgSender, nonce);
    Moloch.submitProposal(msgSender, startingPeriod, title, details, actions);
  }

  function onSubmitVote (address msgSender, uint256 proposalIndex, uint8 uintVote) external {
    _commonChecks();
    Moloch.submitVote(msgSender, proposalIndex, uintVote);
  }

  function onProcessProposal (address msgSender, uint256 proposalIndex) external {
    _commonChecks();
    Moloch.processProposal(proposalIndex);
  }

  function onRagequit (address msgSender, uint256 nonce, uint256 sharesToBurn) external {
    _commonChecks();
    _checkUpdateNonce(msgSender, nonce);
    Moloch.ragequit(msgSender, sharesToBurn);
    // if ragequit did not revert, then increment the exit allowance
    _incrementExit(address(approvedToken), msgSender, sharesToBurn);
  }

  function onAbort (address msgSender, uint256 proposalIndex) external {
    _commonChecks();
    Moloch.abort(msgSender, proposalIndex);
  }

  function onUpdateDelegateKey (address msgSender, uint256 nonce, address newDelegateKey) external {
    _commonChecks();
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
    UtilityBrick._finalizeStateRootAndStorage(blockNumber, hash);
  }

  function _commonChecks () internal {
    // all power the core protocol
    require(msg.sender == address(this));
  }
}
