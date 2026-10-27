# IPGS Marketing Live Integration (v0.3)

The portal now has an authenticated, read-only reconciliation backend and does **not** display demo candidates as real data.

## One-time setup (administrator)

1. Open https://script.google.com/ while signed into a Google account that has read access to all 3 source spreadsheets. Create a new Apps Script project.
2. Copy the contents of `apps-script/Code.gs` into the editor. Save.
   Enable the manifest in Project Settings and use `apps-script/appsscript.json` so Google requests only `spreadsheets.readonly`, rather than edit access. Read access is required for the three source files.
   This manifest enables the Advanced Sheets v4 service. The bridge reads with `Sheets.Spreadsheets.Values.get`; it deliberately avoids `SpreadsheetApp.openById`, which requires the full spreadsheets permission. For the default Cloud project, Apps Script enables the Sheets API automatically. A standard Cloud project requires that API enabled separately.
3. In **Project Settings → Script Properties**, add `BRIDGE_SHARED_SECRET` with a newly generated random secret (at least 32 random bytes). Keep it confidential.
4. In **Deploy → New deployment → Web app**, set Execute as **Me** and access to **Anyone**. This is required because Vercel calls the script without a Google interactive login. The endpoint itself rejects all requests without the secret. Copy the resulting `https://script.google.com/macros/s/.../exec` URL.
5. In the Vercel `ipgs-marketing-portal` project, configure **Production Environment Variables**:
   - `MARKETING_BRIDGE_URL`: the Apps Script web app URL;
   - `MARKETING_BRIDGE_SECRET`: exactly the same long random secret;
   - `PORTAL_PASSWORD`: staff password (do not reuse Google or ACC passwords);
   - `PORTAL_SESSION_SECRET`: another independent long random secret.
6. Redeploy the production deployment so environment variables take effect.
7. Open the portal, sign in and verify counts against the source sheets.

## Data logic

- Marketing: `IPGS Briefing Registration` and `Data Briefing Session`, merged by normalized IC/Passport. The newer form is preferred when a candidate exists in both.
- ACC: `V2_APPLICATIONS`, matched using normalized IC/Passport.
- Snapshot: `STUDENT_PAYMENT_TRACKER`, active records only; source of truth for activation.
- Activated without matching ACC is tracked independently; the `Applied in ACC` measure is the count with an ACC record, not merely activated records.
- Intake spelling variants such as `Mei`, `May`, `Sept` and `September` are grouped under English month names. The selected month and year are preserved; intakes are never moved to an official intake without review.
- Header checks reject changed source layouts. Row limits fail explicitly instead of returning truncated counts.
- The portal refreshes every five minutes while visible, on focus and on manual Refresh Data. Snapshot freshness remains governed by its existing daily update.
- The bridge is **read-only** and only transmits records in response to an authenticated server-side request.
- The portal locks access until environment variables are configured. Never put secrets in frontend JavaScript, query strings or GitHub.

## Security and release limitations

The first login implementation is a single shared staff password, **not** individual team accounts. Only grant the password to trusted staff. For institutional rollout, replace it with user-specific SSO and roles, activity logging, and review data retention policies.

The Apps Script web app must be deployed by an authorised Google account: ChatGPT's connected Google Drive access does not grant permission to create/deploy Apps Script projects. If the organisation disallows “Anyone” deployment, use Google Cloud service-account authentication instead.

## Files

- `index.html`: portal UI, locked until authenticated and connected
- `api/login.js`: server-side signed-session login
- `api/marketing.js`: authenticated server-to-server bridge
- `api/_auth.js`: signed session verification
- `api/logout.js`: clears the current browser session cookie
- `apps-script/Code.gs`: read-only Google Apps Script bridge
- `apps-script/appsscript.json`: explicit read-only Google Sheets permission

## Verification checkpoint — 27 October 2026

Connector reads confirmed the three configured source spreadsheet IDs and column layouts. The matching engine was run against those reads: 202 marketing records with an IC/passport, 196 unique candidates, 92 ACC matches, 104 without an ACC match and 74 active Snapshot matches. Two active candidates had no ACC match. Six duplicate registrations were consolidated. Two legacy rows contained a name/label only and no IC/passport, and were excluded from identity matching.

These are a point-in-time validation, not proof of a deployed bridge or an automatic sync. Recheck after the Apps Script endpoint and Vercel variables are configured. Do not place raw candidate fixtures or credentials in the repository.

## Production verification — 27 October 2026, 21:40 MYT

The deployed Google bridge and the production portal API both returned the same live summary: 196 unique candidates, 92 ACC matches, 104 without ACC matches, 74 active Snapshot matches, and 2 active candidates without an ACC match. An unauthenticated request to `/api/marketing` returned 401; the staff login succeeded and issued a Secure, HttpOnly session cookie. The authenticated production API returned HTTP 200 with `sourceStatus: live` and 196 candidate records. No source spreadsheet was edited.

The first deployment's read method was corrected to use the Advanced Sheets service with the existing read-only grant. Production credentials are configured only in Apps Script properties and Vercel Production variables. The one-time bootstrap source has been replaced with a helper that contains no credential values.
