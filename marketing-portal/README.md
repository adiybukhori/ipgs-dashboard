# IPGS Marketing Portal

English-language marketing conversion portal in `adiybukhori/ipgs-dashboard/marketing-portal`.

- Merges both Marketing Registration tabs by normalised IC/passport.
- Counts ACC applications independently of Snapshot activation.
- Shows programme/intake breakdowns and candidate details after authentication.
- Refreshes every five minutes while the authenticated page is visible, on window focus, or with Refresh Data.
- Does not write to Marketing, ACC or Snapshot. Candidate records are not persisted in local storage.
- Shared staff-password login currently; individual team accounts and roles remain future work.

## Deployment and access

Production project: `ipgs-marketing-portal`, root directory `marketing-portal`.
See [LIVE-INTEGRATION.md](LIVE-INTEGRATION.md) for the Google Apps Script bridge and Vercel variables.
The portal remains locked until these are configured. A deployment alone does not establish a live data connection.

## Checks

Run `node --test marketing-portal/tests/reconciliation.test.cjs` from the repository root.
