#!/bin/sh

set -xe
trap 'docker-compose down --timeout 1' exit

docker-compose run --use-aliases --rm -p 8111:8111 dev -i
