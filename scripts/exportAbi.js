#!/usr/bin/env node

import { readFileSync } from 'fs';

const abi = JSON.parse(readFileSync(process.argv[2])).abi;
const res = [];

for (let i = 0; i < abi.length; i++) {
  const ele = abi[i];
  let params = '';
  if (!ele.inputs) {
    continue;
  }
  ele.inputs.forEach(
    (input) => {
      params += input.type;
      if (input.indexed) {
        params += ' indexed';
      }
      if (input.name) {
        params += ` ${input.name}, `;
      } else {
        params += `, `;
      }
    }
  );
  params = params.slice(0, -2);
  let outputs = '';
  let str = ele.type + ' ' + ele.name + '(' + params + ')';
  if (ele.outputs) {
    ele.outputs.forEach(
      (output) => {
        if (output.name) {
          outputs += `${output.type} ${output.name}, `;
        } else {
          outputs += `${output.type}, `;
        }
      }
    );
  }

  const mut = ['view', 'pure', 'payable'];
  const mutability = mut[mut.indexOf(ele.stateMutability)];
  if (mutability) {
    str += ' ' + mutability;
  }

  if (outputs) {
    outputs = outputs.slice(0, -2);
    str += ' returns (' + outputs + ')';
  }

  res.push(str);
}

console.log('export default', res);
