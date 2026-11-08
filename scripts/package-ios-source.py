"""Export only app source for upload to a public GitHub build repository."""
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
folders = {".github", "src", "public", "build", "scripts", "tests", "ios", "docs"}
files = {
    ".gitignore", ".prettierignore", ".prettierrc.json", "README.md", "index.html",
    "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts",
    "vitest.config.ts", "playwright.config.ts", "playwright.pwa.config.ts",
    "playwright.native.config.ts", "capacitor.config.ts",
}
listed = subprocess.check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=root,
).decode().split("\0")
paths = sorted({p for p in listed if p and (p in files or Path(p).parts[0] in folders)})
for required in ("package-lock.json", "capacitor.config.ts", ".github/workflows/ios-build.yml",
                 "ios/App/App.xcodeproj/project.pbxproj", "ios/App/App/PrivacyInfo.xcprivacy"):
    if required not in paths:
        raise SystemExit(f"Missing required source: {required}")
output = root / "artifacts/LARYN-iOS-source.zip"
output.parent.mkdir(exist_ok=True)
workflow = (root / ".github/workflows/ios-build.yml").read_bytes()
workflow_copy = "LARYN-iPhone-workflow.txt"
(output.parent / workflow_copy).write_bytes(workflow)
start_here = """LARYN IPHONE SOURCE PROJECT - START HERE

This folder contains the source needed to build the iPhone app.
The older website ZIP (index.html, sw.js, and icons only) cannot build an IPA.

1. Extract this ZIP on Windows.
2. Open your public GitHub repository, then Code > Add file > Upload files.
3. Upload ALL the extracted contents to the repository root and commit to main.
   Include .github, ios, src, public, scripts, package.json, and package-lock.json.
   Do not upload the ZIP itself or an extra enclosing folder.
4. In GitHub's Code tab, confirm package.json and ios are visible at the top level.
   Also confirm .github/workflows/ios-build.yml exists.
5. Open Actions > Build LARYN for iPhone > Run workflow.

IF ACTIONS STILL SHOWS NO WORKFLOW

The .github folder may have been missed during upload. In GitHub:
  Code > Add file > Create new file
Use this exact filename (including the folders):
  .github/workflows/ios-build.yml
Open LARYN-iPhone-workflow.txt from this ZIP in Notepad.
Copy ALL its text into GitHub's file editor, then commit to the default branch.
Refresh Actions. The text file at the repository root is only a copy; GitHub
recognizes the .yml file in .github/workflows.

The full Windows/AltStore installation guide is docs/ios-without-mac.md.
The build uses a free standard cloud Mac runner in a PUBLIC repository.
It produces an unsigned IPA for personal installation through AltStore Classic.
"""
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for relative in paths:
        path = root / relative
        if path.is_symlink() or any(part.startswith(".env") for part in path.parts):
            raise SystemExit(f"Unexpected source file: {relative}")
        archive.write(path, relative)
    archive.writestr(workflow_copy, workflow)
    archive.writestr("START-HERE.txt", start_here)
with zipfile.ZipFile(output) as archive:
    if archive.testzip():
        raise SystemExit("Source archive integrity check failed")
    if archive.read(workflow_copy) != archive.read(".github/workflows/ios-build.yml"):
        raise SystemExit("The visible workflow copy must match the actual workflow")
print(f"Created {output}: {len(paths) + 2} files, {output.stat().st_size:,} bytes")
print("This is source code, not an IPA. Run the included manual GitHub workflow to build it.")
