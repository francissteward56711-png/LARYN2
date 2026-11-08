"""Package a device build for local signing by AltStore Classic on Windows."""
import plistlib
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

app = Path(sys.argv[1]).resolve()
info = plistlib.loads((app / "Info.plist").read_bytes())
if info.get("CFBundleSupportedPlatforms") != ["iPhoneOS"]:
    raise SystemExit("A real iPhone build is required; simulator apps cannot be installed.")
binary = app / info["CFBundleExecutable"]
magic, cpu = struct.unpack("<II", binary.read_bytes()[:8])
if magic != 0xFEEDFACF or cpu != 0x0100000C:
    raise SystemExit("Expected a 64-bit ARM iPhone executable.")
if not (app / "public/index.html").is_file():
    raise SystemExit("Bundled app screens are missing. Run npm run ios:sync first.")
output = Path("artifacts/LARYN-unsigned.ipa").resolve()
output.parent.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="laryn-ipa-") as temp:
    payload = Path(temp) / "Payload"
    payload.mkdir()
    shutil.copytree(app, payload / "App.app", symlinks=True)
    subprocess.run(
        ["ditto", "-c", "-k", "--sequesterRsrc", "--keepParent", str(payload), str(output)],
        check=True,
    )
with zipfile.ZipFile(output) as archive:
    for name in ("Info.plist", info["CFBundleExecutable"], "public/index.html"):
        if f"Payload/App.app/{name}" not in archive.namelist():
            raise SystemExit(f"Incomplete IPA: {name}")
print(f"Created {output} ({output.stat().st_size:,} bytes). Sign with AltStore before installing.")
