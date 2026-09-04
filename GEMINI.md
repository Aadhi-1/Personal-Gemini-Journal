# Custom Instructions (GEMINI.md)

See full directives in `./AGENTS.md`.

## Google Maps Platform Security & Architecture Directive
- **Credentials & Zero-Hardcoding**: Store all Google Maps API keys in Google Cloud Secret Manager or environment variables (`GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`). Never commit hardcoded keys.
- **Key Restrictions**: Restrict web API keys to HTTP referrers and designated APIs (`run.googleapis.com`, Maps JavaScript API, Places API, Geocoding API).
- **Attribution**: Include `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}` on the `@vis.gl/react-google-maps` `<Map>` component.
- **Owner-Bound Storage**: Pinned location metadata (`name`, `lat`, `lng`, `placeId`, `formattedAddress`) is saved inside the user's private Firestore interaction document under `/users/{userId}/interactions/{interactionId}`.
- **Input Validation**: Validate coordinate ranges (-90 <= lat <= 90, -180 <= lng <= 180) and sanitize place query strings.
