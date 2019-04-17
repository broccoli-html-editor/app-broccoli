#!/bin/bash

TMP_DIR_PREFIX="_tmp_build_broccoli_";
TMP_DIR_NAME=$(date '+%Y%m%d_%H%M%S');
REPOSITORY_URL="https://github.com/broccoli-html-editor/app-broccoli.git";
APPLE_IDENTITY;

while getopts i: OPT
do
    case $OPT in
        "i" ) APPLE_IDENTITY="$OPTARG" ;;
    esac
done

shift `expr $OPTIND - 1`

BRANCH_NAME=$1;
if [ ! $1 ]; then
    BRANCH_NAME="develop";
fi

echo "-------------------------";
echo "build Start!";
echo "temporary dir = ~/${TMP_DIR_PREFIX}${TMP_DIR_NAME}/"
echo "repository = ${REPOSITORY_URL}"
echo "branch name = ${BRANCH_NAME}"
if [ $APPLE_IDENTITY ]; then
    echo "Apple IDENTITY = ${APPLE_IDENTITY}"
fi
echo $(date '+%Y/%m/%d %H:%M:%S');

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= making build directory";
mkdir ~/${TMP_DIR_PREFIX}${TMP_DIR_NAME};
cd ~/${TMP_DIR_PREFIX}${TMP_DIR_NAME}/;
pwd

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= git clone";
git clone --depth 1 -b ${BRANCH_NAME} ${REPOSITORY_URL} ./;
git submodule update --init --recursive --force;

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= composer install --no-dev";
composer install --no-dev;

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= npm install --only=production";
npm install --only=production;

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= npm install nw-builder";
npm install nw-builder;

if [ $APPLE_IDENTITY ]; then
    sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= Saving Apple IDENTITY";
    echo "${APPLE_IDENTITY}";
    echo ${APPLE_IDENTITY} > ~/${TMP_DIR_PREFIX}${TMP_DIR_NAME}/apple_identity.txt
    sleep 1s; echo "";
fi

sleep 1s; echo ""; echo "=-=-=-=-=-=-=-=-=-= npm run build";
npm run build;

sleep 1s; echo "";
sleep 1s; echo "";
sleep 1s; echo "";
echo "-------------------------";
echo "build completed!";
pwd
echo $(date '+%Y/%m/%d %H:%M:%S');
echo "-------------------------";
exit;
