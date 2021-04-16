export function encodeExternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const addr = ary[i++].replace('0x', '').padStart(64, '0');
    const data = ary[i++].replace('0x', '');
    const dataSize = (data.length / 2).toString(16).padStart(64, '0')

    res += addr + dataSize + data;
  }

  return res;
}

export function encodeInternalProposalActions (ary) {
  let res = '0x';

  for (let i = 0, len = ary.length; i < len;) {
    const type = ary[i++].replace('0x', '').padStart(2, '0');
    if (type !== '01') {
      throw new Error(`unsupported type ${type}`);
    }
    const token = ary[i++].replace('0x', '').padStart(40, '0');
    const receiver = ary[i++].replace('0x', '').padStart(40, '0');
    const value = ary[i++].replace('0x', '').padStart(64, '0');

    res += type + token + receiver + value;
  }

  return res;
}
