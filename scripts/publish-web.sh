#/bin/sh

set -xe

path=$WEB_PATH
if [ -z $path ]; then
  echo 'path missing'
  exit 1
fi

# init ipfs and calculate CID
ipfs init
EXPECTED_CID=$(ipfs --offline add --recursive --hash sha2-256 --cid-version 1 --chunker=size-262144 --only-hash -Q $path | tail -n 1)

if [ -z $EXPECTED_CID ]; then
  exit 1
fi

# can't use ipfs because the connection with the ipfs cli to infura doesn't work
FILES=$(find $path -type f -not -iname ".*")
args=''
set +x
for file in $FILES; do
  filename=${file#"$path"}
  args="$args -F file=@$file;filename=_/$filename"
done
set -x
NEW_CID=$(curl $args $IPFS_API'/api/v0/add?pin=true&cid-version=1&hash=sha2-256&chunker=size-262144' | tail -n 1 | cut -d '"' -f 8)

if [ "$NEW_CID" != "$EXPECTED_CID" ]; then
  exit 1
fi

# update dns
APEX=`echo ${DOMAIN} | awk -F'.' '{print $(NF-1)"."$(NF)}'`
/flyctl dns-records export $APEX > .tmp_zone
OLD_CID=`dig +short TXT _dnslink.${DOMAIN} | sed -e 's/dnslink=\/ipfs\///g' -e 's/"//g'`
cat .tmp_zone
sed -i'' -e "s/$OLD_CID/$NEW_CID/g" .tmp_zone
cat .tmp_zone
/flyctl dns-records import $APEX .tmp_zone
