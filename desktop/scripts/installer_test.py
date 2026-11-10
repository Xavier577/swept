"""Exercise the installer with real signed apps and DMGs; only HTTPS transport is local."""
import hashlib
import os
from pathlib import Path
import plistlib
import pty
import select
import shutil
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
INSTALLER = ROOT / 'web/public/install.sh'
NAME = 'Swept-0.2.0-universal-unnotarized'


def run(*args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


class Installation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = tempfile.TemporaryDirectory(prefix='swept-installer-fixture-')
        cls.root = Path(cls.fixture.name)
        app = cls.root / 'image/Swept.app'
        (app / 'Contents/MacOS').mkdir(parents=True)
        (cls.root / 'main.c').write_text('int main(void) { return 0; }\n')
        run('clang', '-arch', 'arm64', '-arch', 'x86_64', str(cls.root / 'main.c'), '-o', str(app / 'Contents/MacOS/Swept'))
        (app / 'Contents/Info.plist').write_bytes(plistlib.dumps({
            'CFBundleIdentifier': 'com.swept.app', 'CFBundleShortVersionString': '0.2.0',
            'CFBundleExecutable': 'Swept', 'CFBundlePackageType': 'APPL',
        }))
        run('codesign', '--force', '--sign', '-', str(app))
        run('hdiutil', 'create', '-srcfolder', str(cls.root / 'image'), '-format', 'UDZO', str(cls.root / 'good.dmg'))

    @classmethod
    def tearDownClass(cls):
        cls.fixture.cleanup()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='swept-installer-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.assets = self.root / 'assets'
        self.assets.mkdir()
        shutil.copyfile(Path(self.fixture.name) / 'good.dmg', self.assets / f'{NAME}.dmg')
        digest = hashlib.sha256((self.assets / f'{NAME}.dmg').read_bytes()).hexdigest()
        (self.assets / f'{NAME}.sha256').write_text(f'{digest}  {NAME}.dmg\n')
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        # Keep the real installer/verification code. Substitute only downloading
        # a release, so corrupt and missing assets are reproducible without GitHub.
        self.stub('curl', '''#!/bin/bash
set -eu
while [[ $# -gt 0 ]]; do
  case "$1" in --output) output=$2; shift 2;; https://*) url=$1; shift;; *) shift;; esac
done
[[ "$url" == https://github.com/Xavier577/swept/releases/download/v0.2.0/* ]]
cp "$TEST_ASSETS/${url##*/}" "$output"
''')
        self.destination = self.root / 'Applications'

    def stub(self, name, content):
        path = self.bin / name
        path.write_text(content)
        path.chmod(0o755)

    def install(self, answer='y\n', version='v0.2.0'):
        pid, fd = pty.fork()
        if pid == 0:
            os.environ['PATH'] = f'{self.bin}:' + os.environ['PATH']
            os.environ['TEST_ASSETS'] = str(self.assets)
            os.execv('/bin/bash', ['bash', str(INSTALLER), '--version', version, '--unnotarized', '--destination', str(self.destination)])
        output = b''
        os.write(fd, answer.encode())
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            ready, _, _ = select.select([fd], [], [], 0.1)
            if ready:
                try:
                    data = os.read(fd, 65536)
                except OSError:
                    break
                if not data:
                    break
                output += data
        else:
            os.kill(pid, 9)
            self.fail('Installer did not finish: ' + output.decode(errors='replace'))
        os.close(fd)
        _, status = os.waitpid(pid, 0)
        return os.waitstatus_to_exitcode(status), output.decode(errors='replace')

    def existing(self):
        app = self.destination / 'Swept.app'
        shutil.copytree(Path(self.fixture.name) / 'image/Swept.app', app)
        (app / 'keep-on-failure').write_text('previous app')
        (self.destination / 'unrelated.txt').write_text('keep')
        return app

    def test_declining_does_not_download_or_create_destination(self):
        shutil.rmtree(self.assets)
        code, output = self.install('n\n')
        self.assertEqual(code, 0, output)
        self.assertIn('Cancelled', output)
        self.assertFalse(self.destination.exists())

    def test_corrupt_download_preserves_existing_app(self):
        app = self.existing()
        with (self.assets / f'{NAME}.dmg').open('ab') as file:
            file.write(b'corrupt')
        code, output = self.install('y\ny\n')
        self.assertNotEqual(code, 0, output)
        self.assertIn('SHA-256 mismatch', output)
        self.assertTrue((app / 'keep-on-failure').exists())

    def test_missing_checksum_installs_nothing(self):
        (self.assets / f'{NAME}.sha256').unlink()
        code, output = self.install()
        self.assertNotEqual(code, 0, output)
        self.assertFalse(self.destination.exists())

    def test_checksum_for_another_file_is_rejected(self):
        p = self.assets / f'{NAME}.sha256'
        p.write_text(p.read_text().replace(f'{NAME}.dmg', 'another.dmg'))
        code, output = self.install()
        self.assertNotEqual(code, 0, output)
        self.assertIn('Checksum does not describe', output)
        self.assertFalse(self.destination.exists())

    def test_invalid_signature_is_rejected_even_with_matching_checksum(self):
        image = self.root / 'tampered-image'
        shutil.copytree(Path(self.fixture.name) / 'image', image)
        with (image / 'Swept.app/Contents/MacOS/Swept').open('ab') as executable:
            executable.write(b'tampered')
        dmg = self.assets / f'{NAME}.dmg'
        dmg.unlink()
        run('hdiutil', 'create', '-srcfolder', str(image), '-format', 'UDZO', str(dmg))
        digest = hashlib.sha256(dmg.read_bytes()).hexdigest()
        (self.assets / f'{NAME}.sha256').write_text(f'{digest}  {NAME}.dmg\n')
        code, output = self.install()
        self.assertNotEqual(code, 0, output)
        self.assertIn('SHA-256 verified', output)
        self.assertFalse(self.destination.exists())

    def test_verified_install_removes_only_swept_quarantine(self):
        self.destination.mkdir()
        other = self.destination / 'unrelated.txt'
        other.write_text('keep')
        run('xattr', '-w', 'com.apple.quarantine', '0083;12345678;SweptTest;', str(other))
        # Simulate quarantine on the downloaded/copied app.
        self.stub('ditto', '''#!/bin/bash
/usr/bin/ditto "$@" || exit $?
/usr/bin/xattr -w com.apple.quarantine '0083;12345678;SweptTest;' "$2"
''')
        code, output = self.install()
        self.assertEqual(code, 0, output)
        app = self.destination / 'Swept.app'
        run('codesign', '--verify', '--all-architectures', '--deep', '--strict', str(app))
        self.assertNotIn(b'com.apple.quarantine', run('xattr', str(app)).stdout)
        self.assertIn(b'com.apple.quarantine', run('xattr', str(other)).stdout)
        self.assertEqual(list(self.destination.glob('.swept-install.*')), [])

    def test_failed_replacement_restores_previous_app(self):
        app = self.existing()
        self.stub('mv', '''#!/bin/bash
if [[ "$1" == */.swept-install.*/Swept.app ]]; then exit 1; fi
exec /bin/mv "$@"
''')
        code, output = self.install('y\ny\n')
        self.assertNotEqual(code, 0, output)
        self.assertEqual((app / 'keep-on-failure').read_text(), 'previous app')
        self.assertEqual((self.destination / 'unrelated.txt').read_text(), 'keep')

    def test_replacing_verified_app_keeps_unrelated_files(self):
        app = self.existing()
        code, output = self.install('y\ny\n')
        self.assertEqual(code, 0, output)
        self.assertFalse((app / 'keep-on-failure').exists())
        self.assertEqual((self.destination / 'unrelated.txt').read_text(), 'keep')
        self.assertEqual(list(self.destination.glob('.swept-install.*')), [])


if __name__ == '__main__':
    unittest.main()
