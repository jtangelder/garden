# Garden Maintenance Planner (`Tuinonderhoud Planner`)

An **Angular 21** and **Material Design 3** (`@angular/material`) web application with a Dutch user interface and data model that manages your garden maintenance schedule. It integrates directly with **Google Drive**, **Google Sheets**, and **Google Calendar** from the browser so it costs **$0** to host on GitHub Pages (`https://jorik.dev/garden`), running entirely on the signed-in user's Google account quota and optional Google AI Studio credits.

---

## How the Zero-Cost OAuth & User-Credits Architecture Works

### 1. Client-Side Google OAuth 2.0 (Google Identity Services)
Because the app is hosted as a static Single-Page Application (SPA) on GitHub Pages (`jorik.dev/garden`), there is no backend server to pay for or maintain. Instead, it uses the official **Google Identity Services (GIS) Token Model** (`https://accounts.google.com/gsi/client`):

1. When you click **Inloggen met Google**, the browser opens Google's OAuth 2.0 consent popup using your public **OAuth 2.0 Web Client ID**.
2. Google returns a short-lived OAuth 2.0 access token directly to your browser session with three scopes:
   - `https://www.googleapis.com/auth/spreadsheets` — Read your plant list and write enriched maintenance schedules back into your Google Sheet.
   - `https://www.googleapis.com/auth/drive.metadata.readonly` — List the Google Spreadsheets in your Google Drive so you can pick your sheet from a dropdown.
   - `https://www.googleapis.com/auth/calendar` — List your writable Google Calendars, create a dedicated `Tuinonderhoud` calendar if desired, and sync maintenance tasks.
3. All requests to the Google Drive, Sheets, and Calendar REST APIs are made directly from the browser with `Authorization: Bearer <access_token>`. These Workspace APIs are **100% free** and consume only the signed-in user's personal per-user rate quota.

### 2. Fetching & Enriching Plant Care Schedules (Using User Credits)
You only need to enter plant names in Column A (`Plantnaam`) of your Google Sheet (and optionally `Soort / Variëteit` in Column B and `Locatie` in Column C). When a sheet is loaded or when you click **Verrijk Ontbrekende**:

1. **Gemini 2.5 Flash (User Credits)**: If you provide a free personal **Google AI Studio API Key** (`AIza...`) in **Instellingen** (or via your signed-in OAuth session), the app batches all unenriched plants in a single structured-JSON call to `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`.
2. **Built-in Botanical Database Fallback**: If no AI key is configured (or if offline), the app falls back to its built-in Dutch horticultural database (`src/lib/plant_database.ts`) covering common shrubs, perennials, trees, climbers, hedges, herbs, and vegetables.
3. **Cached in Your Google Sheet**: Once enriched, the app immediately writes the schedule columns (`Watergeven Dagen (Zomer)`, `Watergeven Dagen (Winter)`, `Snoeimaanden`, `Knipmaanden`, `Bemestingsmaanden`, `Verzorgingsinstructies`, `Laatst Verrijkt`) back into your Google Sheet. Future loads read directly from the sheet without spending any AI credits, and you can manually tweak any cell in Google Sheets at any time.

### 3. Preview & Idempotent Google Calendar Sync
- The scheduler (`src/lib/scheduler.ts`) uses `Temporal.PlainDate` to calculate upcoming watering days (based on summer vs. winter intervals) and weekend pruning (1st Saturday of the month), trimming (2nd Saturday), and fertilizing (3rd Saturday) tasks across your chosen horizon (30, 90, 180, or 365 days).
- Every generated task gets a deterministic ID (`garden-<action>-<YYYY-MM-DD>`) stored in the Google Calendar event's `extendedProperties.private.gardenTaskId`.
- Before syncing, the app compares generated tasks against existing events in your selected Google Calendar and marks each task as **Nog synchroniseren** (`new`), **Update nodig** (`update`), or **Gesynchroniseerd** (`synced`). Clicking **Sync naar Agenda** only inserts or updates changed events—never creating duplicates.

---

## One-Time Google Cloud OAuth Setup (Free)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Open the [API Library](https://console.cloud.google.com/apis/library) and enable:
   - **Google Drive API**
   - **Google Sheets API**
   - **Google Calendar API**
3. Go to **APIs & Services → OAuth consent screen**:
   - Configure as **External** (in Testing mode, add your own Google email address under **Test users**).
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Under **Authorized JavaScript origins**, add:
     - `https://jorik.dev`
     - `http://localhost:4200`
5. Copy the generated **Client ID** (`...apps.googleusercontent.com`), open the app's **Instellingen** dialog, and paste it in.
6. *(Optional)* Create a free API key at [Google AI Studio](https://aistudio.google.com/apikey) and paste it into the **Gemini API-sleutel** field in **Instellingen**.

---

## Google Sheet Structure (`Planten` tab)

You can click **Voorbeeldsheet** in the app's sidebar to automatically create a ready-to-use Google Sheet in your Drive, or use your own sheet with these columns:

| Column | Dutch Header | Description |
| :--- | :--- | :--- |
| `A` | `Plantnaam` | **Required** — Plant name (e.g., `Hortensia 'Annabelle'`, `Olijfboom`) |
| `B` | `Soort / Variëteit` | Optional — Botanical name (auto-filled if left blank) |
| `C` | `Locatie` | Optional — Location in the garden (e.g., `Voortuin border`) |
| `D` | `Watergeven Dagen (Zomer)` | Auto-enriched — Days between watering in Apr–Sep |
| `E` | `Watergeven Dagen (Winter)` | Auto-enriched — Days between watering in Oct–Mar (`0` = rainfall only) |
| `F` | `Snoeimaanden` | Auto-enriched — Structural pruning months (e.g., `Mrt` or `Nov, Dec`) |
| `G` | `Knipmaanden` | Auto-enriched — Trimming/deadheading months (e.g., `Jun, Sep`) |
| `H` | `Bemestingsmaanden` | Auto-enriched — Fertilizing months (e.g., `Apr, Jun`) |
| `I` | `Verzorgingsinstructies` | Auto-enriched — Concise Dutch care instructions |
| `J` | `Laatst Verrijkt` | Auto-enriched — Date last enriched (`YYYY-MM-DD`) |

---

## Running, Testing, and Deploying

### Install Dependencies
```bash
npm install
```

### Run Development Server
Starts the local Angular dev server at `http://localhost:4200/`:
```bash
npm start
```

### Run Linter & Unit Tests
```bash
# Lint TypeScript files with gts / ESLint
npm run lint

# Run Vitest unit tests
npm test

# Run Vitest with coverage report
npm run test:coverage
```

### Production Build
Compiles the production bundle into `dist/garden`:
```bash
npm run build
```

### Deploy to GitHub Pages (`jorik.dev/garden`)
Just like `refuse`, this project uses `angular-cli-ghpages` to lint, run all unit tests, build the production app, and publish `dist/garden` to the `gh-pages` branch of `https://github.com/jtangelder/garden.git`:
```bash
npm run deploy
```
