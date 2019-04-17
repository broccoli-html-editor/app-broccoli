#!/bin/sh

filename="appicon"
rm -f "${filename}.icns"

array=(16 32 128 256 512)
mkdir ".iconset"

for i in "${array[@]}"
do
    sips -Z $i ${filename}.png --out ".iconset/icon_${i}x${i}.png"
    sips -Z $((i*2)) ${filename}.png --out ".iconset/icon_${i}x${i}@2x.png"
done

# <アイコン名>.iconset フォルダじゃないとダメらしいので
target="${filename}-osx.iconset"
mv ".iconset" $target

iconutil -c icns $target
rm -rf $target


##########################
# Windows
#  L favicon      (16 24 32)
#  L desktop-icon (32 48 128 256)
array=(16 24 32 48 128 256)
mkdir ".iconset"

for i in "${array[@]}"
do
    sips -Z $i ${filename}.png --out ".iconset/icon_${i}x${i}.png"
done

# <アイコン名>.iconset フォルダじゃないとダメらしいので
w_target="${filename}-win.iconset"
mv ".iconset" $w_target

iconutil -c icns $w_target
rm -rf $w_target
