
export function getDeployCode (codeStr) {
  let ret = codeStr;
  // cut after the last match of the INVALID opcode
  const i = ret.lastIndexOf('fe');
  if (i !== -1) {
    ret = ret.substring(0, i + 2);
  }

  // PUSH1 11;
  // CODESIZE;
  // SUB;
  // DUP1;
  // PUSH1 11;
  // RETURNDATASIZE;
  // CODECOPY;
  // RETURNDATASIZE;
  // RETURN;
  const DEPLOY_CODE = '0x600b380380600b3d393df3';
  return ret.replace('0x', DEPLOY_CODE);
}
