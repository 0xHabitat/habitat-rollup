#!/bin/sh

set -xe

cp src/rollup/habitatV1.js web/lib/typedData.js
for x in src/*/scripts/codegen.js;do $x; done

yarn develatus-apparatus-compile src/*/**/*.sol src/*/**/**/*.sol
./scripts/exportAbi.js build/contracts/HabitatV1.json > web/lib/HabitatAbi.js
./scripts/exportAbi.js build/contracts/ExecutionProxy.json > web/lib/ExecutionProxyAbi.js
