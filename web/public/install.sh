#!/bin/bash
# Inspect before running: https://github.com/Xavier577/swept/blob/main/web/public/install.sh
set -euo pipefail

fail() { printf 'Swept: %s\n' "$*" >&2; exit 1; }
confirm() {
  local answer
  printf '%s [y/N] ' "$1" >/dev/tty
  IFS= read -r answer </dev/tty || return 1
  [[ "$answer" == y || "$answer" == Y || "$answer" == yes ]]
}
fetch() {
  curl --fail --show-error --location --silent --proto '=https' --proto-redir '=https' \
    --connect-timeout 20 --max-time 300 --retry 2 --output "$2" "$1"
}

main() {
  local version='' unnotarized=false destination="$HOME/Applications"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version) [[ $# -ge 2 ]] || fail 'Missing version'; version=$2; shift 2 ;;
      --unnotarized) unnotarized=true; shift ;;
      --destination) [[ $# -ge 2 ]] || fail 'Missing destination'; destination=$2; shift 2 ;;
      --help) printf 'Usage: bash install.sh --version vX.Y.Z [--unnotarized] [--destination /absolute/folder]\n'; return ;;
      *) fail "Unknown option: $1" ;;
    esac
  done
  [[ "$(uname -s)" == Darwin ]] || fail 'This installer requires macOS.'
  [[ "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-beta\.[1-9][0-9]*)?$ ]] || fail 'Specify a release with --version vX.Y.Z.'
  [[ "$(sw_vers -productVersion)" =~ ^([0-9]+)\. ]] || fail 'Cannot read macOS version.'
  (( BASH_REMATCH[1] >= 13 )) || fail 'Swept requires macOS 13 or later.'
  [[ "$destination" == /* && "$destination" != / ]] || fail 'Destination must be an absolute folder path.'
  [[ "$EUID" -ne 0 ]] || fail 'Run as your own user, without sudo.'
  [[ -t 0 || -r /dev/tty ]] || fail 'Run in an interactive Terminal.'
  if pgrep -x Swept >/dev/null; then fail 'Quit Swept before installing.'; fi

  local name="Swept-${version#v}-universal" base
  if "$unnotarized"; then name="$name-unnotarized"; fi
  base="https://github.com/Xavier577/swept/releases/download/$version"
  target="$destination/Swept.app"
  printf 'Install Swept %s into %s\n' "$version" "$target"
  printf 'The download and SHA-256 come from Xavier577/swept on GitHub.\n'
  printf 'A matching checksum verifies the download, not whether the app is malware-free.\n'
  if "$unnotarized"; then
    printf '\nThis release is NOT notarized by Apple. Installation removes the quarantine\nflag from Swept only, skipping its downloaded-app Gatekeeper check.\nGatekeeper remains enabled for other apps.\n\n'
  fi
  confirm 'Continue with this installation?' || { printf 'Cancelled. Nothing installed.\n'; return; }
  if [[ -e "$target" || -L "$target" ]]; then
    [[ -d "$target" && ! -L "$target" ]] || fail 'Existing Swept.app is not a regular app folder.'
    [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$target/Contents/Info.plist")" == com.swept.app ]] || fail 'The existing app is not Swept.'
    confirm 'Replace the existing Swept app? Your settings and history will be kept.' || { printf 'Cancelled. Existing app kept.\n'; return; }
  fi

  work=$(mktemp -d "${TMPDIR:-/tmp}/swept-download.XXXXXX")
  stage=''
  mounted=false
  installed=false
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  printf 'Downloading %s…\n' "$version"
  fetch "$base/$name.dmg" "$work/$name.dmg"
  fetch "$base/$name.sha256" "$work/checksum"
  local expected filename extra actual
  [[ "$(awk 'END {print NR}' "$work/checksum")" == 1 ]] || fail 'Invalid checksum file.'
  read -r expected filename extra < "$work/checksum"
  [[ "$expected" =~ ^[a-fA-F0-9]{64}$ && "$filename" == "$name.dmg" && -z "$extra" ]] || fail 'Checksum does not describe the requested DMG.'
  actual=$(shasum -a 256 "$work/$name.dmg")
  [[ "${actual%% *}" == "$expected" ]] || fail 'SHA-256 mismatch. Nothing installed.'
  printf 'SHA-256 verified. Checking disk image and app…\n'
  hdiutil verify "$work/$name.dmg" >/dev/null
  mkdir "$work/mount"
  hdiutil attach "$work/$name.dmg" -readonly -nobrowse -mountpoint "$work/mount" >/dev/null
  mounted=true
  local source="$work/mount/Swept.app" numeric="${version#v}"
  numeric=${numeric%%-*}
  [[ -d "$source" && ! -L "$source" ]] || fail 'The DMG does not contain Swept.app.'
  [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$source/Contents/Info.plist")" == com.swept.app ]] || fail 'Unexpected app identity.'
  [[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$source/Contents/Info.plist")" == "$numeric" ]] || fail 'Unexpected app version.'
  codesign --verify --all-architectures --deep --strict "$source"
  local architectures
  architectures=$(/usr/bin/file "$source/Contents/MacOS/Swept")
  [[ "$architectures" == *arm64* && "$architectures" == *x86_64* ]] || fail 'Expected a Universal app for Apple Silicon and Intel.'
  if ! "$unnotarized"; then spctl --assess --type execute "$source"; fi

  mkdir -p "$destination"
  stage=$(mktemp -d "$destination/.swept-install.XXXXXX")
  ditto "$source" "$stage/Swept.app"
  codesign --verify --all-architectures --deep --strict "$stage/Swept.app"
  if "$unnotarized"; then xattr -dr com.apple.quarantine "$stage/Swept.app"; fi
  hdiutil detach "$work/mount" >/dev/null
  mounted=false
  if pgrep -x Swept >/dev/null; then fail 'Swept opened during installation. Quit it and try again.'; fi
  if [[ -e "$target" ]]; then mv "$target" "$stage/previous.app"; fi
  mv "$stage/Swept.app" "$target"
  installed=true
  printf '\nInstalled Swept %s. Open %s in Finder.\n' "$version" "$target"
}

cleanup() {
  local status=$?
  if [[ "$mounted" == true ]]; then hdiutil detach "$work/mount" >/dev/null 2>&1 || true; fi
  if [[ -n "$stage" ]]; then
    if [[ "$installed" != true && -d "$stage/previous.app" ]]; then
      if ! mv "$stage/previous.app" "$target"; then
        printf 'Restore your previous app from %s/previous.app\n' "$stage" >&2
        return "$status"
      fi
    fi
    rm -rf "$stage"
  fi
  rm -rf "$work"
  return "$status"
}

# A piped download must reach this line before any installation starts.
main "$@"
