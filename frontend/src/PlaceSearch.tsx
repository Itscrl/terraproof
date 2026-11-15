import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { api } from "./api";
import type { Bounds } from "./soil-types";

type Place = { label: string; latitude: number; longitude: number };
export default function PlaceSearch({
  onLocate,
}: {
  onLocate: (bounds: Bounds) => void;
}) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  function locate(place: Place) {
    const halfLat = 0.0025;
    const halfLon =
      halfLat / Math.max(0.1, Math.cos((place.latitude * Math.PI) / 180));
    onLocate({
      west: Math.max(-180, place.longitude - halfLon),
      east: Math.min(180, place.longitude + halfLon),
      south: Math.max(-85, place.latitude - halfLat),
      north: Math.min(85, place.latitude + halfLat),
    });
    setSelected(place.label);
    setPlaces(undefined);
  }
  async function search() {
    setBusy(true);
    setError("");
    setSelected("");
    try {
      setPlaces(
        (
          await api<{ places: Place[] }>(
            `/places/search?q=${encodeURIComponent(query.trim())}`,
          )
        ).places,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function useLocation() {
    if (!navigator.geolocation) {
      setError("Location is unavailable. Search a place or enter coordinates.");
      return;
    }
    setError("");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locate({
          label: `Near your location (device accuracy about ${Math.round(coords.accuracy)} m)`,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setBusy(false);
      },
      () => {
        setError(
          "Your device could not share its location. Search a place or enter coordinates.",
        );
        setBusy(false);
      },
      { timeout: 15000, maximumAge: 60000 },
    );
  }
  return (
    <div className="place-search">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="place-query">Find your land</label>
        <div className="place-search-controls">
          <input
            id="place-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={3}
            maxLength={120}
            required
            placeholder="Village, town or address"
            type="search"
          />
          <button type="submit" disabled={busy}>
            <Search size={16} /> {busy ? "Finding…" : "Search"}
          </button>
          <button type="button" onClick={useLocation} disabled={busy}>
            <MapPin size={16} /> My location
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="soil-error">
          {error}
        </p>
      )}
      {places && (
        <div aria-live="polite">
          {places.length === 0 ? (
            <p>
              No places found. Add the province or country, or enter
              coordinates.
            </p>
          ) : (
            <ul className="place-results">
              {places.map((place, i) => (
                <li key={i}>
                  <button type="button" onClick={() => locate(place)}>
                    <MapPin size={16} />
                    <span>{place.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {selected && (
        <p role="status">
          Showing {selected}. The starting box is approximate; draw it around
          your land.
        </p>
      )}
      <p className="place-credit">
        Place search:{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        . Search runs only when you press Search.
      </p>
    </div>
  );
}
