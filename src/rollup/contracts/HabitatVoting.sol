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
  function _validateTimestamp (uint256 timestamp) internal {
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
    address contractAddress = HabitatBase.vaultCondition(vault);
    require(contractAddress != address(0), 'VAULT');

    bytes32 expectedHash = HabitatBase.moduleHash(contractAddress);
    require(expectedHash != bytes32(0), 'HASH');

    bool valid;
    assembly {
      valid := eq( extcodehash(contractAddress), expectedHash )
    }

    require(expectedHash != bytes32(0) && valid == true, 'CODE');

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

    // xxx Should the vault condition receive a callback at creation?
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
    require(proposalStartDate(proposalId) == 0, 'EXISTS');

    // store
    HabitatBase._setProposalStartDate(proposalId, startDate);
    HabitatBase._setProposalVault(proposalId, vault);
    HabitatBase._setProposalHashInternal(proposalId, keccak256(internalActions));
    HabitatBase._setProposalHashExternal(proposalId, keccak256(externalActions));
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

    require(signalStrength > 0 && signalStrength < 101);

    address account = msgSender;
    if (delegatedFor != address(0)) {
      require(HabitatBase.accountDelegate(delegatedFor) == msgSender, 'DELEGATE');
      account = delegatedFor;
    }

    address vault = HabitatBase.proposalVault(proposalId);
    bytes32 communityId = HabitatBase.communityOfVault(vault);
    address token = HabitatBase.tokenOfCommunity(communityId);
    // only check token here, assuming any invalid vault will end with having a zero address
    require(token != address(0), 'VAULT');
    //
    require(shares > 0 && getErc20Balance(token, account) >= shares, 'SHARE');

    // update member count first
    HabitatBase._maybeUpdateMemberCount(proposalId, account);

    // xxx
    // check proposalId
    // replace any existing votes
    // check token balances, shares, signalStrength
    uint256 previousVote = HabitatBase.getVote(proposalId, account);
    uint256 previousSignal = HabitatBase.getVoteSignal(proposalId, account);
    if (previousVote == 0) {
      HabitatBase._incrementVoteCount(proposalId);
    }
    HabitatBase._setVote(proposalId, account, shares);
    HabitatBase._setVoteSignal(proposalId, account, signalStrength);

    // update total share count
    uint256 t = HabitatBase.getTotalVotingShares(proposalId);
    if (previousVote >= shares) {
      HabitatBase._setTotalVotingShares(proposalId, t - (previousVote - shares));
    } else {
      HabitatBase._setTotalVotingShares(proposalId, t + (shares - previousVote));
    }

    uint256 totalSignal = HabitatBase.getTotalVotingSignal(proposalId);
    if (previousSignal >= signalStrength) {
      HabitatBase._setTotalVotingSignal(proposalId, totalSignal - (previousSignal - signalStrength));
    } else {
      HabitatBase._setTotalVotingSignal(proposalId, totalSignal + (signalStrength - previousSignal));
    }

    emit VotedOnProposal(account, proposalId, signalStrength, shares);
  }

  /// @dev Invokes IModule.onProcessProposal(...) on `vault`
  function _callProcessProposal (bytes32 proposalId, address vault) internal returns (uint256 votingStatus) {
    bytes32 communityId = HabitatBase.communityOfVault(vault);

    // statistics
    uint256 totalMemberCount = HabitatBase.getTotalMemberCount(communityId);
    uint256 totalVotingShares = HabitatBase.getTotalVotingShares(proposalId);
    uint256 totalVotingSignal = HabitatBase.getTotalVotingSignal(proposalId);
    uint256 totalVoteCount = HabitatBase.getVoteCount(proposalId);
    uint256 secondsPassed;
    {
      uint256 now = RollupCoreBrick._getTime();
      uint256 proposalStartDate = HabitatBase.proposalStartDate(proposalId);

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
      mstore(0, 0)
      let success := staticcall(MAX_GAS, vaultCondition, add(_calldata, 32), mload(_calldata), 0, 32)
      if success {
        votingStatus := mload(0)
      }
    }
  }

  function onProcessProposal (
    address msgSender,
    uint256 nonce,
    bytes32 proposalId,
    bytes calldata internalActions,
    bytes calldata externalActions
  ) external returns (uint256 votingStatus) {
    HabitatBase._commonChecks();
    HabitatBase._checkUpdateNonce(msgSender, nonce);

    address vault = HabitatBase.proposalVault(proposalId);
    require(vault != address(0), 'VAULT');
    uint256 previousVotingStatus = HabitatBase.getProposalStatus(proposalId);
    require(previousVotingStatus < 2, 'CLOSED');

    votingStatus = _callProcessProposal(proposalId, vault);

    // update proposal status (if needed)
    if (votingStatus != 0 && votingStatus != previousVotingStatus) {
      HabitatBase._setProposalStatus(proposalId, votingStatus);

      // PASSED
      if (votingStatus == 3) {
        bytes32 hash = keccak256(internalActions);
        require(HabitatBase.proposalHashInternal(proposalId) == hash, 'IHASH');
        _executeInternalActions(vault, internalActions);

        hash = keccak256(externalActions);
        require(HabitatBase.proposalHashExternal(proposalId) == hash, 'EHASH');
        if (externalActions.length != 0) {
          HabitatBase._setExecutionPermit(vault, proposalId, hash);
        }
      }
      emit ProposalProcessed(proposalId, votingStatus);
    }
  }
}
