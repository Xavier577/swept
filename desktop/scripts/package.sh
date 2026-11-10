#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Public packages require signing. --local is an explicit, visibly named test build.
mode=${1:-release}
[[ "$mode" == release || "$mode" == --local ]] || { echo "Usage: $0 [release|--local]" >&2; exit 1; }
version=${SWEPT_VERSION:?Set SWEPT_VERSION, e.g. 0.2.0}
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must be X.Y.Z" >&2; exit 1; }
app=bin/Swept.app
[[ -d "$app" ]] || { echo "Build Swept.app first" >&2; exit 1; }
actual=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")
[[ "$actual" == "$version" ]] || { echo "App version $actual does not match $version" >&2; exit 1; }
lipo "$app/Contents/MacOS/Swept" -verify_arch arm64 x86_64
name="Swept-$version-universal"
if [[ "$mode" == --local ]]; then
  name="$name-local-test"
else
  : "${APPLE_SIGNING_IDENTITY:?Set Developer ID Application signing identity}"
  : "${NOTARY_PROFILE:?Set notarytool keychain profile}"
  [[ "$APPLE_SIGNING_IDENTITY" == 'Developer ID Application: '* ]] || { echo "A Developer ID Application identity is required" >&2; exit 1; }
fi
mkdir -p bin/release
stage=$(mktemp -d "${TMPDIR:-/tmp}/swept-package.XXXXXX")
trap 'rm -rf "$stage"' EXIT
ditto "$app" "$stage/Swept.app"
if [[ "$mode" == release ]]; then
  codesign --force --options runtime --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$stage/Swept.app"
  codesign --verify --deep --strict "$stage/Swept.app"
  ditto -c -k --keepParent "$stage/Swept.app" "$stage/notarize.zip"
  xcrun notarytool submit "$stage/notarize.zip" --keychain-profile "$NOTARY_PROFILE" --wait --output-format json > "$stage/notary.json"
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); print("App notarization:",r["status"]); sys.exit(r["status"] != "Accepted")' "$stage/notary.json"
  xcrun stapler staple "$stage/Swept.app"
  xcrun stapler validate "$stage/Swept.app"
  spctl --assess --type execute --verbose "$stage/Swept.app"
  rm "$stage/notarize.zip" "$stage/notary.json"
fi
ln -s /Applications "$stage/Applications"
dmg="bin/release/$name.dmg"
[[ ! -e "$dmg" ]] || { echo "Refusing to overwrite $dmg" >&2; exit 1; }
hdiutil create -volname "Swept $version" -srcfolder "$stage" -ov -format UDZO "$dmg"
if [[ "$mode" == release ]]; then
  codesign --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$dmg"
  xcrun notarytool submit "$dmg" --keychain-profile "$NOTARY_PROFILE" --wait --output-format json > "$stage/notary.json"
  python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); print("DMG notarization:",r["status"]); sys.exit(r["status"] != "Accepted")' "$stage/notary.json"
  xcrun stapler staple "$dmg"
  xcrun stapler validate "$dmg"
  spctl --assess --type open --context context:primary-signature --verbose "$dmg"
fi
hdiutil verify "$dmg"
(cd bin/release && shasum -a 256 "$name.dmg" > "$name.sha256")
python3 - "$dmg" "$stage/Swept.app" "$version" "$mode" <<'PYTHON'
import json, os, pathlib, sys
file, app, version, mode = sys.argv[1:]
size = os.path.getsize(file)
installed = sum(p.stat().st_size for p in pathlib.Path(app).rglob('*') if p.is_file())
metadata = dict(version=version, architecture='universal', minimumMacOS='13.0', notarized=mode=='release', downloadBytes=size, installedBytes=installed)
pathlib.Path(file).with_suffix('.json').write_text(json.dumps(metadata, indent=2)+'\n')
print(f'DMG: {size / 1024**2:.2f} MiB; installed files: {installed / 1024**2:.2f} MiB')
PYTHON
