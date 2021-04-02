#!/bin/sh

set -xe
trap 'docker-compose down --timeout 1' err exit

docker-compose run --rm -p 8111:8111 dev -i