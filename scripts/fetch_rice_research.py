"""Download public rice research archives; preserve bytes, hashes and access failures.

Does not submit access requests, fill guestbooks, or overwrite earlier downloads.
"""

import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

import httpx

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data/external/rice-alternatives"
ARCHIVES = {
    "irri-1987.zip": "https://geodata.ucdavis.edu/carob/zip/doi_10.7910_DVN_75MPJJ.zip",
    "irri-1988.zip": "https://geodata.ucdavis.edu/carob/zip/doi_10.7910_DVN_WYCUMH.zip",
    "irri-1989.zip": "https://geodata.ucdavis.edu/carob/zip/doi_10.7910_DVN_ECKKQO.zip",
    "china-paddy-2023.zip": "https://zenodo.org/records/20077393/files/PaddyYield2023.zip?download=1",
    "ph-yield-nutrients.csv": "https://zenodo.org/api/records/22639994/files/PH_Rice_Yield_Nutrients_Water_Ecosystems_N83.csv/content",
}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    records = []
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        for name, url in ARCHIVES.items():
            path = DEST / name
            record = {"file": name, "url": url}
            try:
                if not path.exists():
                    response = client.get(url)
                    response.raise_for_status()
                    # A failed HTML response must not be saved as a dataset archive.
                    if name.endswith(".zip") and not response.content.startswith(b"PK"):
                        raise ValueError("Response is not a ZIP archive")
                    with path.open("xb") as handle:
                        handle.write(response.content)
                record.update(
                    status="available_locally", sha256=hashlib.sha256(path.read_bytes()).hexdigest()
                )
                if name.startswith("irri-") and name.endswith(".zip"):
                    with ZipFile(path) as archive:
                        for member in archive.namelist():
                            if member.endswith(".csv"):
                                target = DEST / Path(member).name
                                if not target.exists():
                                    with target.open("xb") as handle:
                                        handle.write(archive.read(member))
            except (httpx.HTTPError, ValueError, OSError) as exc:
                record.update(status="failed", reason=str(exc))
            records.append(record)
    (DEST / "downloads.json").write_text(json.dumps(records, indent=2) + "\n")
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
