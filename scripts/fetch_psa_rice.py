"""Acquire archived PSA production/area responses from the saved query specifications."""

from pathlib import Path

import httpx
from prepare_psa_rice import main as prepare

DEST = Path(__file__).resolve().parents[1] / "data/external/psa-rice"
BASE = "https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/2E/CS/"
TABLES = {"production": "0012E4EVCP0.px", "area": "0022E4EAHC0.px"}


def main():
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        for name, table in TABLES.items():
            path = DEST / f"{name}.json"
            if path.exists():
                continue
            response = client.post(
                BASE + table,
                content=(DEST / f"{name}-query.json").read_bytes(),
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload.get("data"), list):
                raise ValueError(f"Unexpected PSA response for {name}")
            with path.open("xb") as handle:
                handle.write(response.content)
    prepare()


if __name__ == "__main__":
    main()
