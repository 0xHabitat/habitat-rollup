// SPDX-License-Identifier: MPL-2.0
pragma solidity >=0.6.2;

import './HabitatBase.sol';
import './HabitatWallet.sol';

/// @notice Voting Functionality.
contract HabitatVoting is HabitatBase, HabitatWallet {
  event ProposalCreated(address indexed vault, bytes32 indexed proposalId, uint256 startDate, string metadata);
  event VotedOnProposal(address indexed account, bytes32 indexed proposalId, uint8 signalStrength, uint256 shares);
  event ProposalProcessed(bytes32 indexed proposalId, uint256 indexed votingStatus);

  /// @dev Validates if `timestamp` is inside a valid range.
  /// `timestamp` should not be under/over now +- `PROPOSAL_DELAY`.
  function _validateTimestamp (uint256 timestamp) internal virtual {
    uint256 time = RollupCoreBrick._getTime();
    uint256 delay = PROPOSAL_DELAY();
    require(
      time > delay && ((time + delay) > timestamp),
      'TIME'
    );
    if (time > timestamp) {
      require(time - timestamp <= delay, 'TIME');
    }
  }

  /// @dev Lookup condition (module) and verify the codehash
  function _getVaultCondition (address vault) internal returns (address) {
    address contractAddress = address(HabitatBase._getStorage(_VAULT_CONDITION_KEY(vault)));
    require(contractAddress != address(0), 'VAULT');

    uint256 expectedHash = HabitatBase._getStorage(_MODULE_HASH_KEY(contractAddress));
    require(expectedHash != 0, 'HASH');

    bool valid;
    assembly {
      valid := eq( extcodehash(contractAddress), expectedHash )
    }

    require(expectedHash != 0 && valid == true, 'CODE');

    return contractAddress;
  }

  /// @dev Parses and executes `internalActions`.
  /// xxx Only `TRANSFER_TOKEN` is currently implemented
  function _executeInternalActions (address vaultAddress, bytes calldata internalActions) internal {
    // Types, related to actionable proposal items on L2.
    // L1 has no such items and only provides an array of [<address><calldata] for on-chain execution.
    // enum L2ProposalActions {
    //  RESERVED,
    //  TRANSFER_TOKEN,
    //  UPDATE_COMMUNITY_METADATA
    // }

    uint256 ptr;
    uint256 end;
    assembly {
      let len := internalActions.length
      ptr := internalActions.offset
      end := add(ptr, len)
    }

    while (ptr < end) {
      uint256 actionType;

      assembly {
        actionType := byte(0, calldataload(ptr))
        ptr := add(ptr, 1)
      }

      // TRANSFER_TOKEN
      if (actionType == 1) {
        address token;
        address receiver;
        uint256 value;
        assembly {
          token := shr(96, calldataload(ptr))
          ptr := add(ptr, 20)
          receiver := shr(96, calldataload(ptr))
          ptr := add(ptr, 20)
          value := calldataload(ptr)
          ptr := add(ptr, 32)
        }
        _transferToken(token, vaultAddress, receiver, value);
        continue;
      }

      revert('ACTION');
    }

    if (ptr > end) {
      revert('INVALID');
    }
  }

  /// @dev Invokes IModule.onCreateProposal(...) on `vault`
  function _callCreateProposal (
    address vault,
    address proposer,
    uint256 startDate,
    bytes memory internalActions,
    bytes memory externalActions
  ) internal {
    bytes32 communityId = HabitatBase.communityOfVault(vault);
    // statistics
    uint256 totalMemberCount = HabitatBase.getTotalMemberCount(communityId);
    address governanceToken = HabitatBase.tokenOfCommunity(communityId);
    uint256 totalValueLocked = HabitatBase.getTotalValueLocked(governanceToken);
    uint256 proposerBalance = getBalance(governanceToken, proposer);
    // call vault with all the statistics
    bytes memory _calldata = abi.encodeWithSelector(
      0x5e79ee45,
      communityId,
      totalMemberCount,
      totalValueLocked,
      proposer,
      proposerBalance,
      startDate,
      internalActions,
      externalActions
    );
    uint256 MAX_GAS = 90000;
    address vaultCondition = _getVaultCondition(vault);
    assembly {
      let success := staticcall(MAX_GAS, vaultCondition, add(_calldata, 32), mload(_calldata), 0, 0)
      // revert and forward any returndata
      if iszero(success) {
        returndatacopy(0, 0, returndatasize())
        revert(0, returndatasize())
      }
    }
  }

  /// xxx: change this to support the convention: community > (vault w/ condition). {proposal,vote,finalize}
  /// todo
  /// internal transfers
  /// metadata updates - only for 'primary' vault?
  function onCreateProposal (
    address msgSender,
    uint256 nonce,
    uint256 startDate,
    address vault,
    bytes memory internalActions,
    bytes memory externalActions,
    string calldata metadata
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);
    _validateTimestamp(startDate);

    bytes32 proposalId;
    assembly {
      mstore(0, msgSender)
      mstore(32, nonce)
      let backup := mload(64)
      mstore(64, vault)
      proposalId := keccak256(0, 96)
      mstore(64, backup)
    }

    // assuming startDate is never 0 (see validateTimestamp) then this should suffice
    require(HabitatBase._getStorage(_PROPOSAL_START_DATE_KEY(proposalId)) == 0, 'EXISTS');

    // The vault module receives a callback at creation
    _callCreateProposal(vault, msgSender, startDate, internalActions, externalActions);

    // store
    HabitatBase._setStorage(_PROPOSAL_START_DATE_KEY(proposalId), startDate);
    HabitatBase._setStorage(_PROPOSAL_VAULT_KEY(proposalId), vault);
    HabitatBase._setStorage(_PROPOSAL_HASH_INTERNAL_KEY(proposalId), keccak256(internalActions));
    HabitatBase._setStorage(_PROPOSAL_HASH_EXTERNAL_KEY(proposalId), keccak256(externalActions));
    // update member count
    HabitatBase._maybeUpdateMemberCount(proposalId, msgSender);

    emit ProposalCreated(vault, proposalId, startDate, metadata);
    // internal event for submission deadlines
    UtilityBrick._emitTransactionDeadline(startDate);
  }

  /// @dev State transition routine for `VoteOnProposal`.
  function onVoteOnProposal (
    address msgSender,
    uint256 nonce,
    bytes32 proposalId,
    uint256 shares,
    address delegatedFor,
    uint8 signalStrength
  ) external {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    // requires that the signal is in a specific range...
    require(signalStrength < 101, 'SIGNAL');

    // voter account
    address account = msgSender;
    if (delegatedFor != address(0)) {
      require(address(HabitatBase._getStorage(_ACCOUNT_DELEGATE_KEY(delegatedFor))) == msgSender, 'DELEGATE');
      account = delegatedFor;
    }

    address vault = address(HabitatBase._getStorage(_PROPOSAL_VAULT_KEY(proposalId)));
    bytes32 communityId = HabitatBase.communityOfVault(vault);
    address token = HabitatBase.tokenOfCommunity(communityId);
    // only check token here, assuming any invalid proposalId / vault will end with having a zero address
    require(token != address(0), 'VAULT');

    // xxx
    // replace any existing votes
    // check token balances, shares, signalStrength
    uint256 previousVote = HabitatBase.getVote(proposalId, account);
    uint256 previousSignal = HabitatBase._getStorage(_VOTING_SIGNAL_KEY(proposalId, account));
    if (previousVote == 0) {
      HabitatBase._incrementStorage(HabitatBase._VOTING_COUNT_KEY(proposalId), 1);
    } else if (shares == 0) {
      require(signalStrength == 0, 'SIGNAL');
      HabitatBase._decrementStorage(HabitatBase._VOTING_COUNT_KEY(proposalId), 1);
    }

    // check for discrepancy between balance and stake
    {
      uint256 stakableBalance = _getUnstakedBalance(token, account) + previousVote;
      require(stakableBalance >= shares, 'SHARE');
    }

    HabitatBase._maybeUpdateMemberCount(proposalId, account);
    HabitatBase._setStorage(_VOTING_SHARES_KEY(proposalId, account), shares);
    HabitatBase._setStorage(_VOTING_SIGNAL_KEY(proposalId, account), signalStrength);

    // update total share count and staking amount
    if (previousVote >= shares) {
      uint256 delta = previousVote - shares;
      HabitatBase._decrementStorage(_VOTING_TOTAL_SHARE_KEY(proposalId), delta);
      // xxx claim any acquired fees
      // decrease stake
      HabitatBase._decrementStorage(_VOTING_ACTIVE_STAKE_KEY(token, account), delta);
    } else {
      uint256 delta = shares - previousVote;
      HabitatBase._incrementStorage(_VOTING_TOTAL_SHARE_KEY(proposalId), delta);
      // xxx claim any acquired fees
      // increase stake
      HabitatBase._incrementStorage(_VOTING_ACTIVE_STAKE_KEY(token, account), delta);
    }

    if (previousSignal >= signalStrength) {
      HabitatBase._decrementStorage(_VOTING_TOTAL_SIGNAL_KEY(proposalId), previousSignal - signalStrength);
    } else {
      HabitatBase._incrementStorage(_VOTING_TOTAL_SIGNAL_KEY(proposalId), signalStrength - previousSignal);
    }

    emit VotedOnProposal(account, proposalId, signalStrength, shares);
  }

  /// @dev Invokes IModule.onProcessProposal(...) on `vault`
  function _callProcessProposal (
    bytes32 proposalId,
    address vault
  ) internal returns (uint256 votingStatus, uint256 secondsTillClose)
  {
    bytes32 communityId = HabitatBase.communityOfVault(vault);

    // statistics
    uint256 totalMemberCount = HabitatBase.getTotalMemberCount(communityId);
    uint256 totalVotingShares = HabitatBase.getTotalVotingShares(proposalId);
    uint256 totalVotingSignal = HabitatBase._getStorage(_VOTING_TOTAL_SIGNAL_KEY(proposalId));
    uint256 totalVoteCount = HabitatBase.getVoteCount(proposalId);
    uint256 secondsPassed;
    {
      uint256 now = RollupCoreBrick._getTime();
      uint256 proposalStartDate = HabitatBase._getStorage(_PROPOSAL_START_DATE_KEY(proposalId));

      if (now > proposalStartDate) {
        secondsPassed = now - proposalStartDate;
      }
    }

    address governanceToken = HabitatBase.tokenOfCommunity(communityId);
    uint256 totalValueLocked = HabitatBase.getTotalValueLocked(governanceToken);
    // call vault with all the statistics
    bytes memory _calldata = abi.encodeWithSelector(
      0xf8d8ade6,
      proposalId,
      communityId,
      totalMemberCount,
      totalVoteCount,
      totalVotingShares,
      totalVotingSignal,
      totalValueLocked,
      secondsPassed
    );
    uint256 MAX_GAS = 90000;
    address vaultCondition = _getVaultCondition(vault);
    assembly {
      // clear memory
      mstore(0, 0)
      mstore(32, 0)
      // call
      let success := staticcall(MAX_GAS, vaultCondition, add(_calldata, 32), mload(_calldata), 0, 64)
      if success {
        votingStatus := mload(0)
        secondsTillClose := mload(32)
      }
    }
  }

  function onProcessProposal (
    address msgSender,
    uint256 nonce,
    bytes32 proposalId,
    bytes calldata internalActions,
    bytes calldata externalActions
  ) external returns (uint256 votingStatus, uint256 secondsTillClose) {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    address vault = address(HabitatBase._getStorage(_PROPOSAL_VAULT_KEY(proposalId)));
    require(vault != address(0), 'VAULT');
    uint256 previousVotingStatus = HabitatBase.getProposalStatus(proposalId);
    require(previousVotingStatus < 2, 'CLOSED');

    (votingStatus, secondsTillClose) = _callProcessProposal(proposalId, vault);

    // update proposal status (if needed)
    //if (votingStatus != 0 && votingStatus != previousVotingStatus) {
    {
      HabitatBase._setStorage(_PROPOSAL_STATUS_KEY(proposalId), votingStatus);

      // PASSED
      if (votingStatus == 3) {
        bytes32 hash = keccak256(internalActions);
        require(HabitatBase._getStorage(_PROPOSAL_HASH_INTERNAL_KEY(proposalId)) == uint256(hash), 'IHASH');
        _executeInternalActions(vault, internalActions);

        hash = keccak256(externalActions);
        require(HabitatBase._getStorage(_PROPOSAL_HASH_EXTERNAL_KEY(proposalId)) == uint256(hash), 'EHASH');
        if (externalActions.length != 0) {
          HabitatBase._setExecutionPermit(vault, proposalId, hash);
        }
      }
      emit ProposalProcessed(proposalId, votingStatus);
    }
  }
}
