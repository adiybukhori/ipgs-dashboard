# IPGS Marketing Portal (Prototype)

Interactive, English-language static prototype of the IPGS Marketing Management System.

## Current scope

- Marketing overview and candidate conversion funnel
- Candidate pipeline and programme/intake filtering
- Browser-local sample candidates and follow-up tasks
- Placeholder panels for source connections and team management

**Demo only:** no actual marketing registration, ACC V2 or daily student snapshot data is connected. No real authentication or shared backend exists. Do not enter real student information into this public demo.

## Deployment (Vercel)

1. Import Git repository `adiybukhori/ipgs-dashboard` into a **new** Vercel project named `ipgs-marketing-portal`.
2. Set the **Root Directory** to `marketing-portal`.
3. Set Framework Preset to **Other** (static HTML); no build command is required.
4. Deploy from `main`.

The repository's existing root-level `index.html` belongs to another page and is intentionally untouched. The marketing prototype lives only in this subdirectory.

Before production usage, implement secure team sign-in, authorized server-side integration and access controls for student data.
