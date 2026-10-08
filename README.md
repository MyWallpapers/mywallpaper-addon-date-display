# Date Display

Date Display is a minimal MyWallpaper Canvas add-on for a localized weekday, date, and optional clock. Dates and time use the desktop's local time zone for every locale; System follows the browser's language. Its settings keep the existing Content, Language, Typography, and Appearance groups.

It uses cached `Intl.DateTimeFormat` instances for locale-aware formatting and updates on the next second, minute, or local midnight as needed. The timer resynchronizes after the Canvas becomes visible again. Weekday and month names can be overridden. Date formats include full, long, medium, short, and ISO.

On hosts that provide the font resource picker, use it for a new remote font.
It stores a direct font-file URL, which the add-on resolves through `layer.resources.resolve()`
when available and falls back to the saved URL on older hosts. The manual font
URL control remains available in its collapsed compatibility section for
existing stylesheet and direct-file URLs. Stylesheet URLs remain a legacy
fallback; new selections do not load a provider catalog or create an add-on
font cache. Installed fonts remain the default.

Version 4 keeps the existing settings IDs, value types, and current values.
`fontResource` is an additional optional resource setting; the existing
`fontUrl` string is retained for earlier profiles. The add-on has no native
component.

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
