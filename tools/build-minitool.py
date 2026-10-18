from pathlib import Path
import shutil
import zipfile


ROOT = Path(__file__).resolve().parent.parent
STAGE = ROOT / "dist-minitool"
RELEASE = ROOT / "release"
ZIP_PATH = RELEASE / "liupian-pm-minitool.zip"


if STAGE.exists():
    shutil.rmtree(STAGE)
STAGE.mkdir(parents=True)
RELEASE.mkdir(parents=True, exist_ok=True)

shutil.copy2(ROOT / "index.html", STAGE / "index.html")
shutil.copy2(ROOT / "styles.css", STAGE / "styles.css")
shutil.copytree(ROOT / "js", STAGE / "js")

if ZIP_PATH.exists():
    ZIP_PATH.unlink()

files = sorted(path for path in STAGE.rglob("*") if path.is_file())
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(STAGE).as_posix())

with zipfile.ZipFile(ZIP_PATH) as archive:
    names = archive.namelist()

if "index.html" not in names:
    raise SystemExit("index.html is not at the zip root")
if "styles.css" not in names:
    raise SystemExit("styles.css is missing from the zip root")
if "js/ui.js" not in names:
    raise SystemExit("js/ui.js is missing from the zip")

print(f"built {ZIP_PATH}")
print(f"size: {ZIP_PATH.stat().st_size / 1024:.1f} KB")
print(f"entries: {len(names)}")
