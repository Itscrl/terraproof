"""Manual, cached place searches; one process-wide request per second to Nominatim."""

import json
import math
import os
import time
from threading import Lock

import httpx

from .climate import DATA, ClimateError
from .soil import acquire

_gate = Lock()
_last_request = 0.0


def search_places(query: str):
    global _last_request
    query = query.strip()
    if not 3 <= len(query) <= 120:
        raise ClimateError("Enter a village, town or address with 3–120 characters")
    endpoint = os.getenv("TERRAPROOF_GEOCODER_URL", "https://nominatim.openstreetmap.org/search")
    with _gate:
        elapsed = time.monotonic() - _last_request
        if elapsed < 1.05:
            time.sleep(1.05 - elapsed)
        _last_request = time.monotonic()
        with httpx.Client(
            timeout=20,
            follow_redirects=True,
            headers={"User-Agent": "TerraProof/0.1 (https://github.com/Itscrl/terraproof)"},
        ) as client:
            body, provenance = acquire(
                client,
                endpoint,
                {"q": query, "format": "jsonv2", "limit": 5, "accept-language": "en"},
                DATA / "cache" / "places",
            )
    payload = json.loads(body)
    if not isinstance(payload, list) or len(payload) > 5:
        raise ClimateError("Unexpected place-search response")
    places = []
    for item in payload:
        try:
            lat, lon = float(item["lat"]), float(item["lon"])
            if (
                math.isfinite(lat)
                and math.isfinite(lon)
                and -85 <= lat <= 85
                and -180 <= lon <= 180
            ):
                places.append(
                    {"label": str(item["display_name"]), "latitude": lat, "longitude": lon}
                )
        except (KeyError, ValueError, TypeError):
            continue
    return {
        "places": places,
        "attribution": "© OpenStreetMap contributors, ODbL",
        "source": "https://www.openstreetmap.org/copyright",
        "provenance": provenance,
    }
