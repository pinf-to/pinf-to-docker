#!/bin/sh

# @credit http://stackoverflow.com/a/246128/330439
if [ -n "$BASH_SOURCE" ]; then
	SOURCE="${BASH_SOURCE[0]:-$0}"
else
	SOURCE=""
fi
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
BASE_PATH="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
if [ -n "$BASH_SOURCE" ]; then
	BASE_PATH="$( dirname "$BASE_PATH" )"
fi
cd $BASE_PATH



. $BASE_PATH/bin/activate.sh




npm install




echo ""
echo "ACTION: Now run 'source bin/activate.sh' next!"
echo ""

