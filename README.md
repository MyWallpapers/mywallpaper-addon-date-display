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

Publishing is performed only by MyWallpaper's immutable OIDC admission
workflow. A version tag is created only after the pull request is merged and
all quality checks are green. Promotion and recommendation remain separate
owner actions after ingestion and desktop validation.

## License

MIT. See [LICENSE](LICENSE).
