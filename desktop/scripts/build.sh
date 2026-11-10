#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export CGO_ENABLED=1
export MACOSX_DEPLOYMENT_TARGET=12.0
export CGO_CFLAGS="-mmacosx-version-min=12.0"
export CGO_LDFLAGS="-mmacosx-version-min=12.0"
mkdir -p frontend/dist
if [ ! -f frontend/dist/index.html ]; then printf '<html></html>\n' > frontend/dist/index.html; fi
wails3 generate bindings -ts -i
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
go build -tags production -trimpath -ldflags='-s -w' -o bin/Swept .
mkdir -p bin/Swept.app/Contents/MacOS bin/Swept.app/Contents/Resources
cp bin/Swept bin/Swept.app/Contents/MacOS/Swept
cp build/darwin/icons.icns bin/Swept.app/Contents/Resources/icons.icns
cp build/darwin/Info.plist bin/Swept.app/Contents/Info.plist
xattr -cr bin/Swept.app
codesign --force --deep --sign - bin/Swept.app
codesign --verify --deep --strict bin/Swept.app
