#!/bin/sh

set -x

which apk
ret=$?
if [ $ret -eq 0 ]; then
  apk add pngcrush libjpeg-turbo-utils
fi

path=${1:-'.'}
for file in $(find "$path" -name '*.jp*g' | grep -v node_modules/ );do jpegtran -copy all -optimize -progressive -outfile "$file" "$file";done
for file in $(find "$path" -name '*.png' | grep -v node_modules/ );do pngcrush -reduce -brute -ow "$file";done
