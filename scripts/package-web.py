"""Create an uploadable static-site ZIP. Run after npm run build."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from html.parser import HTMLParser
from shutil import copy2

root = Path(__file__).resolve().parent.parent
site = root / "dist"
for required in ["index.html", "manifest.webmanifest", "sw.js", "apple-touch-icon.png"]:
    if not (site / required).is_file():
        raise SystemExit(f"Missing dist/{required}. Run npm run build first.")
# The rendered app must not depend on external scripts or stylesheets.
class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__()
        self.required_files = []
        self.inline_app = False
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "script":
            if attrs.get("src"):
                self.required_files.append(attrs["src"])
            elif attrs.get("type") == "module":
                self.inline_app = True
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.required_files.append(attrs.get("href", "stylesheet"))

check = Dependencies()
check.feed((site / "index.html").read_text())
if check.required_files or not check.inline_app:
    raise SystemExit(f"App is not self-contained; required files: {check.required_files}")
output = root / "artifacts" / "laryn-iphone-app.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted(site.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(site).as_posix())
with ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit("Archive integrity check failed")
    print(f"Packaged {len(archive.namelist())} files: {output} ({output.stat().st_size:,} bytes)")

copy2(site / "index.html", output.parent / "index.html")
copy2(output, output.parent / "LARYN-ready.zip")
copy2(output, output.parent / "LARYN-GitHub-Pages.zip")
print("Standalone app: artifacts/index.html; GitHub Pages upload: artifacts/LARYN-GitHub-Pages.zip")
