# IPGS Marketing Live Integration (v0.3)

The portal now has an authenticated, read-only reconciliation backend and does **not** display demo candidates as real data.

## One-time setup (administrator)

1. Open https://script.google.com/ while signed into a Google account that has read access to all 3 source spreadsheets. Create a new Apps Script project.
2. Copy the contents of `apps-script/Code.gs` into the editor. Save.
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
- `apps-script/Code.gs`: read-only Google Apps Script bridge
