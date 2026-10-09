# Date Display

Date Display is a minimal MyWallpaper Canvas add-on for a localized weekday, date, and optional clock. Dates and time use the desktop's local time zone for every locale; System follows the browser's language. Its settings keep the existing Content, Language, Typography, and Appearance groups.

It uses cached `Intl.DateTimeFormat` instances for locale-aware formatting and updates on the next second, minute, or local midnight as needed. The timer resynchronizes after the Canvas becomes visible again. Weekday and month names can be overridden. Date formats include full, long, medium, short, and ISO.

On hosts that provide the font resource picker, use it for a new remote font.
It accepts direct font files and font stylesheets such as
`https://fonts.cdnfonts.com/css/anurati`. A stylesheet's `@font-face` declarations
provide the native editor's family, weight and style choices; continuous variable
weights get a slider. Text size remains freely adjustable. Direct binary files
keep manual family and variant descriptors.

Stylesheets require browser-readable CORS responses and are read live with bounded
imports, bytes and loading time. Only their font declarations are used; their
other CSS rules are not inserted into the common Canvas document. Direct font
resources continue through `layer.resources.resolve()` when available. No add-on
font cache or server proxy is added. The fallback `fontUrl` is retained for saved
profiles without a selected resource. Installed fonts remain the default.

The previous font remains visible during replacement and on failure. A failed
load exposes **Retry font** in the native inspector. New requests supersede older
ones; removing the add-on releases its registered font faces.

Version 4 keeps the existing settings IDs, value types, and current values.
`fontResource` is an additional optional resource setting; the existing
`fontUrl` string is retained for earlier profiles. The add-on has no native
component.
Version 4.1.2 adds `fontStyle` and `fontVariantWeight` without changing earlier
setting types. The latter stores weights outside the original weight selector;
native controls map their changes back to these declared layer settings.

## Independent elements (4.1)

On hosts with the native child editor, the visible weekday, date and time have
their own move, resize and rotate handles. Select a child to adjust its existing
content/format settings, text size and geometry in MyWallpaper's sidebar.
The optional clock appears in this list after enabling Time.

The original automatic arrangement remains the default. The first geometry edit
captures the visible arrangement before moving its target, leaving the other
elements in place. Saved frames use percentages of the add-on's own canvas;
each frame fits its text without enlarging it beyond the chosen font size.
Use **Restore automatic arrangement** in the native inspector to restore the
default grouping. Gesture previews and cancellation stay visual; commits return
one declared layer setting to the host for saving and undo/redo. There is no
embedded editor, separate storage, polling loop, or new runtime dependency.

`elementLayout` is an additive portable setting. On older hosts, saved geometry
still renders, while the existing ordinary settings stay available. The collapsed
Saved arrangement section is a compatibility fallback for its stored data;
the current native inspector uses handles and fields instead. Earlier releases
and existing pinned instances remain unchanged until explicitly updated.

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
publication with an authenticated creator account and accepted creator terms.

MyWallpaper resolves the exact public repository and commit, dispatches its
pinned central workflow, rebuilds and verifies the artifacts, and publishes the
immutable transport from the platform repository. The add-on repository needs
no publication workflow or MyWallpaper credential. Do not pre-create a GitHub
release: a source tag alone does not publish the add-on to the catalogue.

Each accepted newer release is available for new installations. Existing
wallpapers remain pinned to their exact release until explicitly changed.

## License

MIT. See [LICENSE](LICENSE).
