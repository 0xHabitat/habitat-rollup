import '../TokenTurner.sol';

contract TokenTurnerMock is TokenTurner {
  address inputToken;
  address outputToken;
  address communityFund;
  uint256 public EPOCH;

  function INPUT_TOKEN () internal view override returns (address) {
    return inputToken;
  }

  function OUTPUT_TOKEN () internal view override returns (address) {
    return outputToken;
  }

  function COMMUNITY_FUND () internal view override returns (address) {
    return communityFund;
  }

  constructor (address _outputToken, address _inputToken, address _communityFund) {
    inputToken = _inputToken;
    outputToken = _outputToken;
    communityFund = _communityFund;
  }

  function setEpoch (uint256 _epoch) public {
    EPOCH = _epoch;
  }

  function getCurrentEpoch () public view override returns (uint256 epoch) {
    epoch = EPOCH;
  }
}
