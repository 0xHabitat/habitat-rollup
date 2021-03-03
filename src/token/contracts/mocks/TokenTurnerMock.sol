import '../TokenTurner.sol';

contract TokenTurnerMock is TokenTurner {
  uint256 public EPOCH;

  constructor (address _outputToken, address _inputToken, address _communityFund)
  TokenTurner(_outputToken, _inputToken, _communityFund) public {}

  function setEpoch (uint256 _epoch) public {
    EPOCH = _epoch;
  }

  function getCurrentEpoch () public view override returns (uint256 epoch) {
    epoch = EPOCH;
  }
}
