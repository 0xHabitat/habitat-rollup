import '../DropletWrapper.sol';

contract DropletWrapperMock is DropletWrapper {
  uint256 __activationDelay;
  address __sourceToken;
  address __owner;
  address __droplet;

  constructor (uint256 _delay, address _token, address _owner, address _droplet) {
    __activationDelay = _delay;
    __sourceToken = _token;
    __owner = _owner;
    __droplet = _droplet;
  }

  function OWNER () internal view override returns (address) {
    return __owner;
  }

  function DROPLET () internal view override returns (address) {
    return __droplet;
  }

  function SOURCE_TOKEN () internal view override returns (address) {
    return __sourceToken;
  }

  function ACTIVATION_DELAY () internal view override returns (uint256) {
    return __activationDelay;
  }
}
