# Self-hosted fonts

These WOFF2 files are the Latin subsets of fonts served by Google Fonts. They
are vendored here so `next build` never has to fetch from `fonts.googleapis.com`
at build time.

Next.js has a known issue where Google Fonts intermittently returns
extensionless `fonts.gstatic.com/l/font?kit=…` URLs, which makes
`next/font/google` fail the build on both Turbopack and webpack
(vercel/next.js#99114). Using `next/font/local` with these files keeps builds
deterministic and offline-capable.

All families are licensed under the SIL Open Font License 1.1:

- Geist, Geist Mono
- Roboto
- Open Sans
- Lato
- Montserrat
- Poppins
- Merriweather
- Playfair Display
- Nunito
- Oswald
- Source Code Pro

To update a font, download the Latin WOFF2 from Google Fonts and replace the
corresponding file. Keep the same file names so the imports in
`src/app/layout.tsx` and `src/components/apps/Pencil.tsx` keep working.
