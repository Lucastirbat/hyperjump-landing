# HyperJump landing page

The public landing page for HyperJump, served at **hyperjump.exponential.vc**. It's a static site (Vite + React + Tailwind, with a react-three-fiber hero) and has no server of its own.

It talks to the HyperJump platform (`hyperjump.dev` by default) in two ways:

- **Apply / sign in** links go to `https://hyperjump.dev/sign-in?jump=1`. The landing page plays the first half of the hyperspace jump, and the platform plays the drop-out when it sees `?jump=1`.
- **Past jumpers** cards load from `GET https://hyperjump.dev/api/public/past-jumpers`: the admin's showcase, limited to published entries of startups accepted into a jump, with the one-liner from the Startups list. The platform allows any origin on that endpoint.
- **Pit crew** loads from `GET https://hyperjump.dev/api/public/mentors?cohort=…` (any origin).

To point the site at a different platform URL, set `VITE_APP_URL` at build time (see `.env.example`).

## Develop

```sh
npm install
npm run dev        # http://localhost:5180, /api proxied to hyperjump.dev
npm run build      # typecheck + build to dist/
npm run preview    # serve dist/ locally
```

To use a local platform API instead: `HJ_API=http://localhost:8787 npm run dev`.

## Deploy

The output is `dist/` and there's nothing server-side, so any static host works:

- build command: `npm run build`
- output directory: `dist`
- environment variable (optional): `VITE_APP_URL`

### Cloudflare Workers (static assets)

`wrangler.jsonc` is already set up. Connect this repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository), or run `npm run deploy` locally.

To serve it at `hyperjump.exponential.vc` as a Worker Custom Domain, `exponential.vc` has to be a zone in that Cloudflare account. The hostname must also not already have a CNAME record. Then: Workers & Pages → `hyperjump-landing` → Settings → Domains & Routes → Add → Custom Domain.

If `exponential.vc` DNS is managed somewhere else, use a host that takes an external CNAME instead. Follow that host's custom-domain steps; it usually means adding a CNAME for `hyperjump` at whoever runs the `exponential.vc` DNS.

## Where things are

- `src/landing/`: the page. `landing.tsx` (desktop shell and hero), `sections.tsx` (desktop sections), `mobile.tsx` (below 1024px), `content.ts` (shared copy), `ship-scene.tsx` (3D hero).
- `src/components/hyperspace.tsx`: the hyperspace jump to the platform.
- `public/models/ships/`: the ships in rotation (one per page load).
- `public/landing/el/`: brand marks and illustrations.

Links still marked `TODO` or `#` (exponential, essay, agreement, team page, incorporation guide, contact, socials) are waiting on the real URLs.
