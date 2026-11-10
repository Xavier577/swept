#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export CGO_ENABLED=1
export MACOSX_DEPLOYMENT_TARGET=13.0
export CGO_CFLAGS="-mmacosx-version-min=$MACOSX_DEPLOYMENT_TARGET"
export CGO_LDFLAGS="-mmacosx-version-min=$MACOSX_DEPLOYMENT_TARGET"
architecture=${SWEPT_ARCH:-$(go env GOARCH)}
case "$architecture" in arm64|amd64|universal) ;; *) echo "Unsupported architecture: $architecture" >&2; exit 1;; esac
mkdir -p frontend/dist bin
if [ ! -f frontend/dist/index.html ]; then printf '<html></html>\n' > frontend/dist/index.html; fi
wails3 generate bindings -ts -i
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run build
if [ "$architecture" = universal ]; then
  GOARCH=arm64 go build -tags production -trimpath -ldflags='-s -w' -o bin/Swept-arm64 .
  GOARCH=amd64 go build -tags production -trimpath -ldflags='-s -w' -o bin/Swept-amd64 .
  lipo -create bin/Swept-arm64 bin/Swept-amd64 -output bin/Swept
  lipo bin/Swept -verify_arch arm64 x86_64
else
  GOARCH="$architecture" go build -tags production -trimpath -ldflags='-s -w' -o bin/Swept .
fi
mkdir -p bin/Swept.app/Contents/MacOS bin/Swept.app/Contents/Resources
cp bin/Swept bin/Swept.app/Contents/MacOS/Swept
cp build/darwin/icons.icns bin/Swept.app/Contents/Resources/icons.icns
cp build/darwin/Info.plist bin/Swept.app/Contents/Info.plist
if [ -n "${SWEPT_VERSION:-}" ]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $SWEPT_VERSION" bin/Swept.app/Contents/Info.plist
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${SWEPT_BUILD_NUMBER:-$SWEPT_VERSION}" bin/Swept.app/Contents/Info.plist
fi
xattr -cr bin/Swept.app
codesign --force --sign - bin/Swept.app
codesign --verify --deep --strict bin/Swept.app
