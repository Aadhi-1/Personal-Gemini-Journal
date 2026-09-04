# Custom Instructions (GEMINI.md)

See full directives in `./AGENTS.md`.

## Google Maps Platform Security & Architecture Directive
- **Credentials & Zero-Hardcoding**: Store all Google Maps API keys in Google Cloud Secret Manager or environment variables (`GOOGLE_MAPS_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY`). Never commit hardcoded keys.
- **Key Restrictions**: Restrict web API keys to HTTP referrers and designated APIs (`run.googleapis.com`, Maps JavaScript API, Places API, Geocoding API).
- **Attribution**: Include `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}` on the `@vis.gl/react-google-maps` `<Map>` component.
- **Owner-Bound Storage**: Pinned location metadata (`name`, `lat`, `lng`, `placeId`, `formattedAddress`) is saved inside the user's private Firestore interaction document under `/users/{userId}/interactions/{interactionId}`.
- **Input Validation**: Validate coordinate ranges (-90 <= lat <= 90, -180 <= lng <= 180) and sanitize place query strings.

## Admin Roles Directive & RBAC Security Standard
- **Role Verification**: Admin privileges must be dynamically verified using verified email (`gaudhamanaadhithyiaan@gmail.com` with `email_verified == true`) or trusted Firestore check (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))`). Never trust mutable client claims.
- **Rule Hierarchy**: Follow Denial-of-Wallet order: (1) `isSignedIn()` -> (2) Static validation -> (3) `isAdmin()` check.
- **Audit Requirement**: Elevated administrative actions must generate append-only tamper-evident logs in `/admin_audit_logs`.
- **Zero Insecure Defaults**: Catch-all default deny required on all collections.

## External Notification API Directive & Payload Schema Standard
- **Zero-Hardcoding**: Webhook URLs and tokens stored exclusively in Secret Manager or env vars (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`, `NOTIFICATION_SECRET`). Mask all credentials in UI.
- **SSRF Prevention**: Validate all webhook URLs strictly with HTTPS; reject RFC1918 private subnets, loopback `127.0.0.1`, and metadata IP `169.254.169.254`.
- **Payload Standards**: Conforms strictly to Slack Block Kit, Discord Rich Embeds, and structured email formats.
- **DLP Privacy Shield**: Never transmit raw reflection chat transcripts. Only parsed metadata (category, executive summary, key insights) is dispatched after client-side DLP scrubbing.

