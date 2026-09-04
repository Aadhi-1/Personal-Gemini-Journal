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

---

## 4. Admin Roles Directive & RBAC Security Standard

### Objective
Establish strict architectural and algorithmic rules for how the AI must generate security checks, access controls, and boundary validations for elevated administrative operations.

### Threat Model & Threat Summary Table for Administrative RBAC
| Threat Zone | Identified Vector / Risk | Severity | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Parameter tampering or forged role claims passed in HTTP requests (`{ role: 'admin' }`). | Critical | Zero reliance on client-supplied parameters. Admin privileges are verified dynamically against trusted server-side state or verified email tokens. |
| **Planning & Reasoning** | Prompt injection attempting to convince AI models to execute admin workflows or bypass RBAC guards. | High | Administrative operations are hard-gated behind cryptographic auth headers and database-enforced security rules. Model responses never dictate access authorization. |
| **Tool Execution & APIs** | Privilege escalation via unprotected server endpoints or administrative action routes. | Critical | Enforce dual-layer enforcement: (1) Express API layer validates Bearer tokens and admin email identity; (2) Firestore security rules strictly gate `/admins/*` and `/system/*`. |
| **Memory & State** | Cross-tenant access or unauthorized modification of system-wide configurations and audit trails. | Critical | Append-only audit logging: `/admin_audit_logs/{logId}` forbids `update` and `delete`. Regular users cannot modify system configuration documents under `/system/notifications`. |
| **Inter-System Communication** | Accidental disclosure of system telemetry, secrets, or decrypted user data during admin queries. | High | Administrative telemetry only surfaces sanitized health metrics (rate limit status, circuit breaker states, sanitized audit records). User journal content remains Zero-Knowledge encrypted. |

### Core RBAC Directives & Security Checks
1. **Zero Insecure Defaults**:
   - Never generate permissive rule catch-alls like `allow read, write: if true;` or `allow read: if isSignedIn();` on administrative collections.
2. **Dynamic Server-Side Role Verification**:
   - Auth tokens MUST NOT rely on mutable client claims. Role checks must verify against:
     - Bootstrapped verified admin email: `request.auth.token.email == 'gaudhamanaadhithyiaan@gmail.com' && request.auth.token.email_verified == true`.
     - Dynamic database lookup on trusted collection: `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`.
3. **Denial-of-Wallet Rule Evaluation Order**:
   - All generated security checks must follow the strict evaluation hierarchy:
     1. Request Authentication: `request.auth != null`
     2. Static Validation: Boundary checks on identifiers and timestamps
     3. Relational/Role Validation: `isAdmin()` or document lookups (limiting database billing operations)
4. **Administrative Audit Trail Mandatory Requirement**:
   - Every elevated administrative action (role assignment, webhook reconfiguration, system test dispatch, telemetry inspection) must record a tamper-evident audit record in `/admin_audit_logs`.
   - Audit logs are append-only (`allow create: if isSignedIn(); allow update, delete: if false;`).
5. **Least Privilege Data Isolation**:
   - Admins can inspect system health and notification configurations, but end-user journal contents remain protected by zero-knowledge client-side encryption (Web Worker AES-256-GCM enclave).

---

## 5. External Notification API Directive & Payload Schema Standard

### Objective
Define secure management protocols for authentication credentials, outbound egress controls, data loss prevention (DLP), and schema validation when integrating external notification webhooks (Slack, Discord, Email).

### Threat Model & Threat Summary Table for External Notifications
| Threat Zone | Identified Vector / Risk | Severity | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Server-Side Request Forgery (SSRF) via malicious webhook URLs (e.g., target `http://169.254.169.254` or internal RFC1918 subnets). | Critical | Strict SSRF defense: Protocol must be strictly `https:`. Reject all private/loopback/cloud-metadata IP ranges (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`). |
| **Planning & Reasoning** | Prompt injection attempting to exfiltrate full journal transcripts or secrets into external chat channels. | High | Data Loss Prevention (DLP) Privacy Boundary: Raw journal chat transcripts are strictly forbidden from notification payloads. Only parsed metadata (category, executive summary, key insights) is transmitted. |
| **Tool Execution & APIs** | Webhook denial-of-service or connection hanging from slow third-party servers. | Medium | Enforce strict 5-second outbound timeouts (`AbortSignal.timeout(5000)`) and circuit breaker tracking. |
| **Memory & State** | Exposure of webhook secrets or API tokens in client-side code or public repositories. | Critical | Zero-Hardcoding Hygiene: Webhook credentials stored in Secret Manager / environment variables (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `NOTIFICATION_SECRET`). Client UI displays masked tokens only. |
| **Inter-System Communication** | Corrupted payloads causing webhook rejections or payload injection attacks. | Medium | Strict payload schema conformity: Validated against Slack Block Kit and Discord Webhook Embed structures before network transmission. |

### Core Notification Directives
1. **Zero-Hardcoding Hygiene**:
   - Operational webhook URLs must be read from environment variables or Google Cloud Secret Manager (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `NOTIFICATION_SECRET`).
   - Never commit hardcoded webhook URLs or tokens.
2. **SSRF Guard & Network Egress Hygiene**:
   - Webhook URLs must be parsed using the URL API and validated:
     - Protocol must equal `https:`.
     - Hostname must not resolve to localhost, IPv4 loopback (`127.0.0.1`), link-local metadata (`169.254.169.254`), or private network ranges.
3. **Payload Schema Standard**:
   - **Slack Incoming Webhooks**: Must use Slack Block Kit:
     - `header`: Plain-text service title with emoji.
     - `section`: Structured Markdown describing event type, entry title, category, and mood.
     - `section`: Executive summary.
     - `context`: DLP privacy compliance stamp and timestamp.
   - **Discord Webhooks**: Must use Discord Rich Embeds:
     - `title`: Alert title.
     - `description`: Executive summary.
     - `color`: Hex color integer mapped by trigger priority (Red for Crisis/Safe Mode, Green for Goals, Blue for Reflections).
     - `fields`: Inline fields for Category, Trigger Reason, Mood, and Key Insights.
     - `footer`: ReflectAI Zero-Trust DLP security stamp.
   - **Email Dispatch**: Must use structured email payload with sanitized subject and HTML/text body.
4. **Selective Trigger Rules**:
   - Automated notification dispatch is restricted to designated trigger events:
     - `CRISIS_SAFE_MODE`: Distress Safe Mode activation (highest priority).
     - `GOAL_SETTING`: Goal Setting reflections parsed and structured.
     - `DECISION_MAKING`: Strategic Decision Making reflections parsed and structured.
     - `KEY_INSIGHTS_EXTRACTED`: Gemini executive takeaways synthesized.

