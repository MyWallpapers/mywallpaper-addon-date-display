# Date Display

Date Display is a lightweight MyWallpaper Canvas add-on for showing the
weekday, date, and time. Its settings are grouped into Content, Language,
Typography, and Appearance so the editor stays compact while still exposing
the complete design surface.

It uses the browser's `Intl.DateTimeFormat` implementation for locale-aware
formatting. Authors can override weekday and month names and can load an
optional font stylesheet or font file through a normal credential-free URL.
The add-on has no native component.

## Development

Use Node.js 24 and the pnpm version pinned by `packageManager`:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Run `mywallpaper dev` for the complete in-application preview. The CLI starts a
loopback development server and MyWallpaper Desktop renders the same exported
`mount` entry used by published releases.

## Publishing

Merge the source and matching manifest/package version into the reviewed default
branch, wait for quality checks, then push a new immutable `v<version>` tag.
Open this add-on's management page in MyWallpaper and select that tag to request
publication with an active lifetime entitlement.

MyWallpaper resolves the exact public repository and commit, dispatches its
pinned central workflow, rebuilds and verifies the artifacts, and publishes the
immutable transport from the platform repository. The add-on repository needs
no publication workflow or MyWallpaper credential. Do not pre-create a GitHub
release: a source tag alone does not publish the add-on to the catalogue.

Each accepted newer release is available for new installations. Existing
wallpapers remain pinned to their exact release until explicitly changed.

## License

MIT. See [LICENSE](LICENSE).
