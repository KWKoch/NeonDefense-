#!/bin/sh
# Run before every push: bumps the build number in index.html and the service-worker cache name.
n=$(grep -o 'const BUILD=[0-9]*' index.html | head -1 | grep -o '[0-9]*'); m=$((n+1))
sed -i "s/const BUILD=$n;/const BUILD=$m;/; s/build $n<\/div>/build $m<\/div>/" index.html
sed -i "s/rr-v[0-9]*/rr-v$m/" sw.js
echo "build $m"
