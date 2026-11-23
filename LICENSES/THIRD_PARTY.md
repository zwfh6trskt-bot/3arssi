# Dependencies and licences

## Runtime (shipped to users)
| Package | Version | Licence |
|---|---|---|
| react | 19.2.8 | MIT |
| react-dom | 19.2.8 | MIT |

## Development only
| Package | Licence | Use |
|---|---|---|
| Bun (runtime, bundler, test runner) | MIT | install, dev server, build, unit tests |
| typescript | Apache-2.0 | type checking |
| @types/react, @types/react-dom, @types/bun | MIT | type definitions |
| playwright | Apache-2.0 | end-to-end tests |

## Fonts (in `public/fonts/`)
| Font | Licence |
|---|---|
| Instrument Sans (Regular, Bold) | SIL Open Font License 1.1 — see `LICENSES/OFL-1.1.txt` |
| Instrument Serif (Regular, Italic) | SIL Open Font License 1.1 (same terms) |

The OFL allows use, embedding and redistribution, including commercially; the
fonts may not be sold on their own.

## Own assets (owned by the project)
* Icons (`src/components/Icon.tsx`), landing illustration and favicon — original line drawings made for 3ARSSI.
* Sample portfolio images (`public/img/samples/`) — original abstract illustrations, labelled as samples.

## Backend services (not bundled)
Supabase (Apache-2.0 open-source stack, hosted service under its own terms), Netlify or Vercel (hosting terms).
