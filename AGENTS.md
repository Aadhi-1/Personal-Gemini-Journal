# Custom Instructions & Operational Directives

## 1. Google Maps Security Directive & Integration Standard

### Objective
Provide comprehensive architectural and security rules for interacting with Google Maps Platform APIs (Maps JavaScript API, Places API (New), Geocoding API) and securely retrieving, storing, and utilizing API keys.

### Threat Model & Threat Summary Table for Google Maps
| Threat Zone | Identified Vector / Risk | Severity | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | SSRF or parameter tampering via arbitrary coordinates or unvalidated address strings. | Medium | Enforce strict coordinate boundary validation (-90 <= lat <= 90, -180 <= lng <= 180) and alphanumeric sanitization on location search inputs before querying APIs. |
| **Planning & Reasoning** | Prompt injection attempting to extract operational API keys or inject malicious script tags into place details. | High | Treat place names and addresses returned by Maps APIs strictly as untrusted text strings. Always HTML-encode or render via sanitized React text nodes. |
| **Tool Execution & APIs** | API key theft, unrestricted quota abuse, or quota scraping by third parties. | Critical | Apply **Zero-Hardcoding Hygiene**. Retrieve credentials from Secret Manager or environment variables (`GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`). Direct users to apply HTTP referrer restrictions (`*.run.app`, `localhost`) and API restrictions (limiting to Maps JS, Places, Geocoding). |
| **Memory & State** | Cross-user leakage of personal location data attached to journal entries in Cloud Firestore. | Critical | Owner-bound isolation enforced via `firestore.rules`: `allow read, write: if request.auth != null && request.auth.uid == userId`. Location payloads are strictly tied to `/users/{userId}/interactions/{interactionId}`. |
| **Inter-System Communication** | CORS failure or unauthorized server-side egress when fetching external REST endpoints directly from browser. | High | Use server-side proxy routes (`/api/maps/*`) for Geocoding and Place suggestions with rate limiting and defensiveness, or use the official `@vis.gl/react-google-maps` SDK wrappers. |

### Core Security & Integration Rules
1. **Zero-Hardcoding Hygiene**:
   - Never embed static API keys (`const API_KEY = "AIzaSy..."`) in code or commit files.
   - For backend calls, read `process.env.GOOGLE_MAPS_API_KEY`.
   - For frontend initialization, read `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` or dynamically fetch via `/api/config/maps`.
   - When deploying to Google Cloud Run, mount the secret from Secret Manager:
     ```bash
     gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
     echo -n "YOUR_KEY" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-
     gcloud run services update <SERVICE_NAME> --set-secrets=GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
     ```
2. **API Restrictions & Protection**:
   - Production keys MUST be restricted by HTTP referrer (e.g. `https://<YOUR_APP_ID>.run.app/*`) and restricted to only the APIs used: **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. **Internal Attribution & Compliance**:
   - Always set `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}` on the React `<Map>` component.
   - Always configure a valid `mapId` (e.g., `"DEMO_MAP_ID"`) when rendering `<AdvancedMarker>`.
   - Never use Google Maps data to train or fine-tune AI models.
   - Adhere to the 30-day maximum caching policy for geospatial coordinates.
4. **Resilient User Experience & Demo Key Prototyping**:
   - If an API key is not configured in the environment, the application must provide a graceful UI explaining how to supply a key or use the free Maps Demo Key (`https://mapsplatform.google.com/maps-demo-key`), while permitting interactive pin selection via fallback map rendering.

---

## 2. Gemini AI Resilience & Fallback Protocol
1. **Fallback Ladder**:
   - Primary: `gemini-3.6-flash`
   - High-Availability: `gemini-3.1-flash-lite`
   - Dynamic Alias: `gemini-flash-latest`
   - Deep Reasoning Fallback: `gemini-3.7-flash`
2. **Graceful Handling**:
   - Recoverable status codes (`429`, `503`, `500`) automatically trigger the next tier before returning an error to the user.

---

## 3. Database Persistence & Zero-Crash Payload Hygiene
1. **Strict Undefined Stripping**:
   - All payloads saved to Firestore must be stripped of `undefined` fields using `stripUndefined()` before invoking `setDoc()`.
2. **Owner-Bound Path Checking**:
   - All user data operations are strictly bound to `/users/{userId}/interactions/{interactionId}`.
