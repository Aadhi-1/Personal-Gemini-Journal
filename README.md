# Gemini Reflections & Journal

A user-authenticated contemplative journaling application built with **Google Gemini 3.6 Flash API**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore** enforcing zero-trust, user-isolated document storage.

---

## Architecture & Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **User Identity** | Firebase Authentication | Federated Google Sign-In with popup flow; zero passwords stored. |
| **Backend Database** | Cloud Firestore | User-isolated document storage at `/users/{userId}/interactions/{interactionId}`. |
| **AI Processing Engine** | Gemini 3.6 Flash API | Multi-turn reflections, Socratic questioning, and automated executive summaries. |
| **Model Resilience** | Automated Fallback Ladder | `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`. |
| **Location & Mapping** | Google Maps Platform (`@vis.gl/react-google-maps`) | Location-aware journal entries with pin placement, reverse geocoding, and map preview. |
| **Secret Management** | Google Cloud Secret Manager | Dynamic runtime secret injection; zero API keys exposed in committed code. |
| **Server Framework** | Express + Vite | Full-stack server with unified dev and production start commands. |

---

## 1. Environment & Prerequisites

### Required Tools
- [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install)
- [Firebase CLI (`firebase`)](https://firebase.google.com/docs/cli)
- Node.js (v20+) & npm

### Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com \
  maps-backend.googleapis.com \
  geocoding-backend.googleapis.com \
  places-backend.googleapis.com
```

---

## 2. Secret Management Setup (Google Cloud Secret Manager)

To adhere to zero-hardcoding hygiene, `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` are retrieved from Google Cloud Secret Manager or environment variable injection at runtime.

### Create and Populate Secrets
```bash
# 1. Gemini API Key
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Google Maps API Key
gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
echo -n "YOUR_MAPS_API_KEY" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read secrets
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore)

Firestore documents are strictly isolated by owner authentication UID. Different users are mathematically prohibited from reading or mutating other users' reflections.

### Deploy Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default-deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // User-isolated interactions and reflection transcripts
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```

3. Run the unified dev server (Express + Vite):
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

---

## 5. Google Cloud Run Deployment

Build and deploy the application container to Google Cloud Run:

```bash
# Build and deploy service with Secret Manager bindings
gcloud run deploy gemini-reflections-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest" \
  --port 3000
```

### Mandatory Verification Binding
To register the service for automated challenge verification, apply the campaign label:

```bash
gcloud run services update gemini-reflections-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Walkthrough & Test Suite

| Test Case ID | Feature / Interaction | Steps to Verify | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-01** | Landing Page Unauthenticated State | 1. Access root URL.<br>2. Inspect UI. | Shows landing page with Google Sign-In CTA, feature highlights, and security overview. No protected routes or data visible. |
| **TC-02** | Google Sign-In Authentication | 1. Click "Sign In with Google".<br>2. Complete popup flow. | Authenticates user; transitions to private dashboard; displays user profile picture and email in Navbar. |
| **TC-03** | Start New Reflection Entry | 1. Click "New Reflection" in sidebar.<br>2. Inspect workspace. | Initializes empty conversation canvas with title "New Reflection" and starter prompt chips. |
| **TC-04** | Multi-Turn Gemini Conversation | 1. Type reflection prompt or select a starter prompt.<br>2. Press ⌘+Enter or click Send. | User message appears immediately; Gemini typing indicator displays; Gemini 3.6 Flash generates empathetic, structured response with markdown formatting. |
| **TC-05** | Reflection Mode Switching | 1. Click "Socratic Guide" mode pill.<br>2. Submit follow-up response. | System prompt seamlessly adapts; Gemini formulates probing inquiry questions. |
| **TC-06** | Firestore Real-Time Persistence | 1. Submit a prompt.<br>2. Refresh the browser tab.<br>3. Inspect sidebar entries. | The reflection, title, category, and full transcript persist seamlessly in Firestore under `/users/{userId}/interactions/{entryId}`. |
| **TC-07** | Automated Executive Summarization | 1. Click "Summarize Session" button. | Gemini generates a 2-3 sentence summary and 3-5 bulleted key takeaways; updates the entry title; saves insights to Firestore. |
| **TC-08** | Search & Category Filtering | 1. Type keywords into the search bar.<br>2. Click category pills. | Entries list dynamically filters matching titles, summaries, or message content in real time. |
| **TC-09** | Markdown Export | 1. Click "Export" button in top toolbar. | Downloads formatted `.md` file with session metadata, executive summary, key takeaways, and dialogue transcript. |
| **TC-10** | Delete Entry Confirmation | 1. Hover on entry in sidebar and click trash icon.<br>2. Confirm in modal. | Document is deleted from Firestore and removed from sidebar in real time. |
| **TC-11** | User Data Isolation Security | 1. Sign in as User A, create an entry.<br>2. Sign out and sign in as User B. | User B only sees their own entries; User A's entries are completely inaccessible due to Firestore owner security rules. |
| **TC-12** | Sign Out & Session Teardown | 1. Click "Sign Out" in Navbar. | Clears user session, resets workspace, and returns to landing page. |
| **TC-13** | Pin Location via Modal & Presets | 1. In workspace toolbar, click "Pin Location".<br>2. Select a preset (e.g., Kyoto Bamboo Forest) or search place.<br>3. Click "Confirm Location Pin". | Location modal closes; green location pill appears in toolbar with place name; pinned location banner displays with coordinates. |
| **TC-14** | Google Map Interaction & Firestore Persistence | 1. Pin a location to entry.<br>2. Click "View Map" in location banner.<br>3. Refresh the browser tab. | Map expands showing live Google Map with custom pin marker; location metadata remains persisted in Firestore under the entry document. |
| **TC-15** | Location Search & Markdown Integration | 1. Search in sidebar for the pinned place name.<br>2. Click "Export" in workspace. | Sidebar filters list to the matching location-pinned reflection; exported markdown file includes geographical metadata and coordinates. |
| **TC-16** | Mood Tagging & Emoji Representation | 1. In workspace toolbar, select a mood from the Mood dropdown (e.g. `😊 Joyful`).<br>2. Observe mood emoji beside title and on sidebar card.<br>3. Refresh the browser tab. | Mood tag persists in Firestore; mood emoji remains displayed beside title and in sidebar; searching "Joyful" or "😊" in the sidebar filters to the entry; exported Markdown includes the mood metadata. |
| **TC-17** | FIDO2 Passkey Biometric Vault | 1. Click "Passkey Vault" in Navbar.<br>2. Click "Verify Biometrics / TouchID / FaceID" or enter PIN. | Unlocks client-side Web Worker enclave without transmission of passwords; initializes AES-256-GCM symmetric key. |
| **TC-18** | Silent Duress Vault & Plausible Deniability Decoy | 1. Open Passkey Vault.<br>2. Enter panic PIN `9110` or `9999`. | Silently unlocks benign decoy entries ("Morning Garden & Herbal Tea", "Baking Warm Cinnamon Apples"); logs `DURESS_TRIGGERED` audit event without notifying coercer. |
| **TC-19** | Jarvis Ambient Voice Companion | 1. Click "Jarvis Voice" in Navbar or workspace toolbar.<br>2. Tap glowing microphone orb and speak reflection.<br>3. Toggle text size (Standard / Large / Huge). | Speech recognition transcribes speech locally; Jarvis responds with audio synthesis; UI scales up for children/elderly accessibility. |
| **TC-20** | Audio Data Loss Prevention (DLP) Filter | 1. In voice reflection or message text, include personal phone number or SSN.<br>2. Click "Read Aloud" or listen to Jarvis. | DLP filter scrubs sensitive numbers, phone numbers, and addresses before audio playback; displays privacy audit indicator. |
| **TC-21** | Pre-Encryption Human Safety & Safe Mode | 1. In voice or text input, enter phrases indicating severe distress or click "Safe Mode Assistance". | Triggers on-device distress classifier before data reaches the network; opens Safe Mode Crisis Lifeline modal with one-tap dialing for 988 Lifeline and 911. |
| **TC-22** | Screen Privacy Veil & Auto-Mute | 1. Play active audio or open journal.<br>2. Switch browser tab or background the application window. | Page Visibility API instantly blurs DOM, mutes active audio, and displays Screen Privacy Shield veil until window is refocused. |
| **TC-23** | Cryptographic Erasure ("Right to be Forgotten") | 1. Open Zero-Trust modal via "Zero-Trust" badge in Navbar.<br>2. Click "Crypto-Shred Vault Keys". | Immediately zeroes and shreds CryptoKey in Web Worker enclave; deletes ciphertext records from Firestore; renders past data mathematically unrecoverable. |
| **TC-24** | 30-Day D3.js Mood Insights Enclave Visualization | 1. Click "Mood Insights" in Navbar, Sidebar, or Workspace toolbar.<br>2. Inspect interactive D3 bar chart and mood tags.<br>3. Hover/click on mood bars or tags. | Computes 30-day tag frequencies entirely in client memory; renders animated D3 SVG visualization; shows percentages, sentiment breakdown, and filters reflections by mood. |
| **TC-25** | Jarvis Natural Language Voice Commands | 1. Open Jarvis Voice HUD.<br>2. Speak "I am feeling peaceful", "Summarize session", "Read latest", or "Text size huge".<br>3. Speak "Safe mode assistance". | Intercepts commands locally without network latency; tags reflection mood, triggers Gemini summarization, alters typography, or prompts Safe Mode crisis lifelines. |
| **TC-26** | Real-Time Autosave Feedback Indicator | 1. Edit reflection title or add messages.<br>2. Observe top workspace toolbar and Jarvis HUD. | Displays dynamic state transitions: "Autosaving..." (pulsing spinner) &rarr; "Autosaved (hh:mm)" (emerald checkmark); surfaces explicit retry options on network error. |
