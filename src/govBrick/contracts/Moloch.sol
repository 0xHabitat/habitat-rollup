pragma solidity >=0.6.2;

import './GovBase.sol';
import './oz/SafeMath.sol';

contract Moloch is GovBase {
  using SafeMath for uint256;

  /***************
    GLOBAL CONSTANTS
   ***************/
  uint256 public periodDuration; // default = 17280 = 4.8 hours in seconds (5 periods per day)
  uint256 public votingPeriodLength; // default = 35 periods (7 days)
  uint256 public gracePeriodLength; // default = 35 periods (7 days)
  uint256 public abortWindow; // default = 5 periods (1 day)
  uint256 public dilutionBound; // default = 3 - maximum multiplier a YES voter will be obligated to pay in case of mass ragequit
  uint256 public summoningTime; // needed to determine the current period

  address public approvedToken; // approved token contract reference; default = wETH

  // HARD-CODED LIMITS
  // These numbers are quite arbitrary; they are small enough to avoid overflows when doing calculations
  // with periods or shares, yet big enough to not limit reasonable use cases.
  uint256 constant MAX_VOTING_PERIOD_LENGTH = 10**18; // maximum length of voting period
  uint256 constant MAX_GRACE_PERIOD_LENGTH = 10**18; // maximum length of grace period
  uint256 constant MAX_DILUTION_BOUND = 10**18; // maximum dilution bound

  /***************
    EVENTS
   ***************/
  event SubmitProposal(uint256 proposalIndex, address indexed delegateKey, address indexed memberAddress);
  event SubmitVote(uint256 indexed proposalIndex, address indexed delegateKey, address indexed memberAddress, uint8 uintVote);
  event ProcessProposal(uint256 indexed proposalIndex, address indexed memberAddress, bool didPass);
  event Ragequit(address indexed memberAddress, uint256 sharesToBurn);
  event Abort(uint256 indexed proposalIndex);
  event UpdateDelegateKey(address indexed memberAddress, address newDelegateKey);
  event SummonComplete(address indexed summoner);

  /******************
    INTERNAL ACCOUNTING
   ******************/
  uint256 public totalShares = 0; // total shares across all members

  enum Vote {
    Null, // default value, counted as abstention
      Yes,
      No
  }

  struct Member {
    address delegateKey; // the key responsible for submitting proposals and voting - defaults to member address unless updated
    uint256 shares; // the # of shares assigned to this member
    bool exists; // always true once a member has been created
    uint256 highestIndexYesVote; // highest proposal index # on which the member voted YES
  }

  struct Proposal {
    bool processed; // true only if the proposal has been processed
    bool didPass; // true only if the proposal passed
    bool aborted; // true only if applicant calls 'abort' fn before end of voting period
    address proposer; // the member who submitted the proposal
    uint256 startingPeriod; // the period in which voting can start for this proposal
    uint256 yesVotes; // the total number of YES votes for this proposal
    uint256 noVotes; // the total number of NO votes for this proposal
    uint256 maxTotalSharesAtYesVote; // the maximum # of total shares encountered at a yes vote on this proposal
    string details; // proposal details - could be IPFS hash, plaintext, or JSON
  }

  mapping (uint256 => mapping(address => Vote)) votesByMember; // the votes on a proposal by each member
  mapping (address => Member) public members;
  mapping (address => address) public memberAddressByDelegateKey;
  Proposal[] public proposalQueue;

  function onlyMember (address addr) internal view {
    require(members[addr].shares > 0, 'Moloch::onlyMember - not a member');
  }

  function onlyDelegate (address addr) internal view {
    require(members[memberAddressByDelegateKey[addr]].shares > 0, 'Moloch::onlyDelegate - not a delegate');
  }

  function _checkDeadline (uint256 periods) internal {
    _emitTransactionDeadline( summoningTime.add(periods.mul(periodDuration)) );
  }

  /********
    FUNCTIONS
   ********/
  function initMoloch (
    address summoner,
    address _approvedToken,
    uint256 _periodDuration,
    uint256 _votingPeriodLength,
    uint256 _gracePeriodLength,
    uint256 _abortWindow,
    uint256 _dilutionBound,
    uint256 _summoningTime
  ) internal {
    require(address(approvedToken) == address(0), 'already initialized');
    require(summoner != address(0), 'Moloch::constructor - summoner cannot be 0');
    require(_approvedToken != address(0), 'Moloch::constructor - _approvedToken cannot be 0');
    require(_periodDuration > 0, 'Moloch::constructor - _periodDuration cannot be 0');
    require(_votingPeriodLength > 0, 'Moloch::constructor - _votingPeriodLength cannot be 0');
    require(_votingPeriodLength <= MAX_VOTING_PERIOD_LENGTH, 'Moloch::constructor - _votingPeriodLength exceeds limit');
    require(_gracePeriodLength <= MAX_GRACE_PERIOD_LENGTH, 'Moloch::constructor - _gracePeriodLength exceeds limit');
    require(_abortWindow > 0, 'Moloch::constructor - _abortWindow cannot be 0');
    require(_abortWindow <= _votingPeriodLength, 'Moloch::constructor - _abortWindow must be smaller than or equal to _votingPeriodLength');
    require(_dilutionBound > 0, 'Moloch::constructor - _dilutionBound cannot be 0');
    require(_dilutionBound <= MAX_DILUTION_BOUND, 'Moloch::constructor - _dilutionBound exceeds limit');

    approvedToken = _approvedToken;

    periodDuration = _periodDuration;
    votingPeriodLength = _votingPeriodLength;
    gracePeriodLength = _gracePeriodLength;
    abortWindow = _abortWindow;
    dilutionBound = _dilutionBound;

    summoningTime = _summoningTime;

    emit SummonComplete(summoner);
  }

  /*****************
    PROPOSAL FUNCTIONS
   *****************/

  function submitProposal(
    address msgSender,
    uint256 startingPeriod,
    string memory details
  ) internal
  {
    onlyDelegate(msgSender);

    address memberAddress = memberAddressByDelegateKey[msgSender];

    // create proposal ...
    Proposal memory proposal = Proposal({
      proposer: memberAddress,
      startingPeriod: startingPeriod,
      yesVotes: 0,
      noVotes: 0,
      processed: false,
      didPass: false,
      aborted: false,
      details: details,
      maxTotalSharesAtYesVote: 0
    });

    // ... and append it to the queue
    proposalQueue.push(proposal);

    uint256 proposalIndex = proposalQueue.length.sub(1);
    emit SubmitProposal(proposalIndex, msgSender, memberAddress);
  }

  function submitVote(address msgSender, uint256 proposalIndex, uint8 uintVote) internal {
    onlyDelegate(msgSender);

    address memberAddress = memberAddressByDelegateKey[msgSender];
    Member storage member = members[memberAddress];

    require(proposalIndex < proposalQueue.length, 'Moloch::submitVote - proposal does not exist');
    Proposal storage proposal = proposalQueue[proposalIndex];

    require(uintVote < 3, 'Moloch::submitVote - uintVote must be less than 3');
    Vote vote = Vote(uintVote);

    require(getCurrentPeriod() >= proposal.startingPeriod, 'Moloch::submitVote - voting period has not started');
    require(!hasVotingPeriodExpired(proposal.startingPeriod), 'Moloch::submitVote - proposal voting period has expired');
    require(votesByMember[proposalIndex][memberAddress] == Vote.Null, 'Moloch::submitVote - member has already voted on this proposal');
    require(vote == Vote.Yes || vote == Vote.No, 'Moloch::submitVote - vote must be either Yes or No');
    require(!proposal.aborted, 'Moloch::submitVote - proposal has been aborted');

    // store vote
    votesByMember[proposalIndex][memberAddress] = vote;

    // count vote
    if (vote == Vote.Yes) {
      proposal.yesVotes = proposal.yesVotes.add(member.shares);

      // set highest index (latest) yes vote - must be processed for member to ragequit
      if (proposalIndex > member.highestIndexYesVote) {
        member.highestIndexYesVote = proposalIndex;
      }

      // set maximum of total shares encountered at a yes vote - used to bound dilution for yes voters
      if (totalShares > proposal.maxTotalSharesAtYesVote) {
        proposal.maxTotalSharesAtYesVote = totalShares;
      }

    } else if (vote == Vote.No) {
      proposal.noVotes = proposal.noVotes.add(member.shares);
    }

    emit SubmitVote(proposalIndex, msgSender, memberAddress, uintVote);
    _checkDeadline(proposal.startingPeriod.add(votingPeriodLength));
  }

  function processProposal (address msgSender, uint256 proposalIndex) internal {
    require(proposalIndex < proposalQueue.length, 'Moloch::processProposal - proposal does not exist');
    Proposal storage proposal = proposalQueue[proposalIndex];

    require(getCurrentPeriod() >= proposal.startingPeriod.add(votingPeriodLength).add(gracePeriodLength), 'Moloch::processProposal - proposal is not ready to be processed');
    require(proposal.processed == false, 'Moloch::processProposal - proposal has already been processed');
    require(proposalIndex == 0 || proposalQueue[proposalIndex.sub(1)].processed, 'Moloch::processProposal - previous proposal must be processed');

    proposal.processed = true;

    bool didPass = proposal.yesVotes > proposal.noVotes;

    // Make the proposal fail if the dilutionBound is exceeded
    if (totalShares.mul(dilutionBound) < proposal.maxTotalSharesAtYesVote) {
      didPass = false;
    }

    // PROPOSAL PASSED
    if (didPass && !proposal.aborted) {
      proposal.didPass = true;
    }

    emit ProcessProposal(
      proposalIndex,
      proposal.proposer,
      didPass
    );
  }

  function ragequit(address msgSender, uint256 sharesToBurn) internal {
    onlyMember(msgSender);

    Member storage member = members[msgSender];

    require(member.shares >= sharesToBurn, 'Moloch::ragequit - insufficient shares');
    require(canRagequit(member.highestIndexYesVote), 'Moloch::ragequit - cant ragequit until highest index proposal member voted YES on is processed');

    // burn shares
    member.shares = member.shares.sub(sharesToBurn);
    totalShares = totalShares.sub(sharesToBurn);

    emit Ragequit(msgSender, sharesToBurn);
  }

  function abort(address msgSender, uint256 proposalIndex) internal {
    require(proposalIndex < proposalQueue.length, 'Moloch::abort - proposal does not exist');
    Proposal storage proposal = proposalQueue[proposalIndex];

    require(msgSender == proposal.proposer, 'Moloch::abort - msgSender must be proposer');

    uint256 deadline = proposal.startingPeriod.add(abortWindow);
    require(getCurrentPeriod() < deadline, 'Moloch::abort - abort window must not have passed');
    require(!proposal.aborted, 'Moloch::abort - proposal must not have already been aborted');

    proposal.aborted = true;

    emit Abort(proposalIndex);
    _checkDeadline(deadline);
  }

  function updateDelegateKey(address msgSender, address newDelegateKey) internal {
    onlyMember(msgSender);

    require(newDelegateKey != address(0), 'Moloch::updateDelegateKey - newDelegateKey cannot be 0');

    // skip checks if member is setting the delegate key to their member address
    if (newDelegateKey != msgSender) {
      require(!members[newDelegateKey].exists, 'Moloch::updateDelegateKey - cant overwrite existing members');
      require(!members[memberAddressByDelegateKey[newDelegateKey]].exists, 'Moloch::updateDelegateKey - cant overwrite existing delegate keys');
    }

    Member storage member = members[msgSender];
    memberAddressByDelegateKey[member.delegateKey] = address(0);
    memberAddressByDelegateKey[newDelegateKey] = msgSender;
    member.delegateKey = newDelegateKey;

    emit UpdateDelegateKey(msgSender, newDelegateKey);
  }

  /***************
    GETTER FUNCTIONS
   ***************/

  function getCurrentPeriod() public view returns (uint256) {
    return _getTime().sub(summoningTime).div(periodDuration);
  }

  function getProposalQueueLength() public view returns (uint256) {
    return proposalQueue.length;
  }

  // can only ragequit if the latest proposal you voted YES on has been processed
  function canRagequit(uint256 highestIndexYesVote) public view returns (bool) {
    require(highestIndexYesVote < proposalQueue.length, 'Moloch::canRagequit - proposal does not exist');

    return proposalQueue[highestIndexYesVote].processed;
  }

  function hasVotingPeriodExpired(uint256 startingPeriod) public view returns (bool) {
    return getCurrentPeriod() >= startingPeriod.add(votingPeriodLength);
  }

  function getMemberProposalVote(address memberAddress, uint256 proposalIndex) public view returns (Vote) {
    require(members[memberAddress].exists, 'Moloch::getMemberProposalVote - member doesn\'t exist');
    require(proposalIndex < proposalQueue.length, 'Moloch::getMemberProposalVote - proposal doesn\'t exist');

    return votesByMember[proposalIndex][memberAddress];
  }
}
