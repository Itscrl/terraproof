"""Standalone Vercel place search; no soil-processing dependencies required."""

import json
import math
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


def find_places(query):
    url = "https://photon.komoot.io/api/?" + urlencode({"q": query, "limit": 5, "lang": "en"})
    request = Request(
        url, headers={"User-Agent": "TerraProof/0.1 (https://github.com/Itscrl/terraproof)"}
    )
    with urlopen(request, timeout=8) as response:
        payload = json.load(response)
    places = []
    for feature in payload["features"][:5]:
        try:
            lon, lat = map(float, feature["geometry"]["coordinates"])
            if not (
                math.isfinite(lat)
                and math.isfinite(lon)
                and -85 <= lat <= 85
                and -180 <= lon <= 180
            ):
                continue
            properties = feature["properties"]
            parts = [properties.get(key) for key in ("name", "city", "state", "country")]
            label = ", ".join(
                dict.fromkeys(part for part in parts if isinstance(part, str) and part)
            )
            if label:
                places.append({"label": label, "latitude": lat, "longitude": lon})
        except (KeyError, ValueError, TypeError):
            continue
    return {
        "places": places,
        "attribution": "© OpenStreetMap contributors, ODbL",
        "source": "https://www.openstreetmap.org/copyright",
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlsplit(self.path).query).get("q", [""])[0].strip()
        if not 3 <= len(query) <= 120:
            self.reply(422, {"detail": "Enter a country, town or address with 3–120 characters."})
            return
        try:
            self.reply(200, find_places(query))
        except Exception:
            self.reply(
                503, {"detail": "Place search is unavailable. Try again or enter coordinates."}
            )

    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Cache-Control",
            "public, s-maxage=86400, stale-while-revalidate=604800"
            if status == 200
            else "no-store",
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
