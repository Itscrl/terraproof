# Vercel place search

Set the Vercel project Root Directory to `frontend`, then redeploy after merging.
The Vite build serves the interface and `api/places/search.py` supplies the missing
same-origin `/api/places/search` function. No API key is required.

The function uses Photon/OpenStreetMap for country, town and address lookup,
with an eight-second upstream timeout and one-day CDN caching for successful
queries. Failed requests are not cached. Search still runs only on submission.
Local Python launches retain the existing Nominatim search endpoint.

Verify `/api/places/search?q=Philippines` returns JSON with a `places` array,
then search for a country and town in the globe.

This deploys place search only. Soil and crop assessment still require the full
Python backend; this change does not deploy those services or fix globe imagery.
