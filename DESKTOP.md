# Viste SMS — Windows desktop app

The desktop app is a secure [Electron](https://www.electronjs.org/) window around the
**same deployed Viste SMS web app** (`https://viste-sms.vercel.app`). There is one
codebase, one Firebase project, one Firestore database and one set of users: anything
done in the desktop app is instantly visible on the web and vice versa.

```text
                 EXISTING VISTE SMS CODE  (Next.js + React + Tailwind, /api/v1)
                         │   deployed by Vercel
                         ▼
                https://viste-sms.vercel.app ───── Firebase Auth + Firestore
                 │                      │
              Browser            Viste SMS.exe (Electron shell)
```

## Why the desktop app loads the hosted app

All school data flows through the Next.js `/api/v1` routes, which use the Firebase
**Admin** SDK and its private service-account key. That key must never be shipped to
user machines, and the app cannot be exported as static files. The desktop shell
therefore renders the live web app, so:

- the UI, workflows, permissions and reports are identical (no second UI to maintain);
- no secrets are in the installer — it contains only `electron/` code and the logo;
- web changes deployed by Vercel appear in the desktop app on next launch/reload,
  without a desktop release. A desktop release is only needed when `electron/` changes.

## Layout

```text
electron/                     Desktop shell (own package.json — not installed by Vercel)
  src/main.ts                 Window, navigation/popup security, menu, crash + offline handling
  src/preload.ts              Minimal bridge: window.visteDesktop { isDesktop, platform, getVersion() }
  src/updater.ts              electron-updater (GitHub Releases) + update dialogs
  src/config.ts               App URL (production; dev override only in unpackaged runs)
  src/logger.ts               %APPDATA%\Viste SMS\logs\main.log
  assets/icon.png             App/installer icon (copy of public/viste-logo.png)
  assets/offline.html|js      Shown when the app can't be reached; auto-retries
  scripts/bump-version.mjs    Semver bump helper
  package.json                Version, electron-builder config (NSIS installer, publish target)
.github/workflows/desktop-release.yml
```

## Commands

Run from the repository root.

| Command | What it does |
| --- | --- |
| `npm run dev` | Web app (unchanged) at http://localhost:3000 |
| `npm run desktop:install` | One-time: install the desktop package deps in `electron/` |
| `npm run electron:dev` | Desktop shell against local `npm run dev` (start that first) |
| `npm run desktop:start` | Desktop shell (unpackaged) against production |
| `npm run desktop:build` | Unpacked build → `electron/release/win-unpacked/Viste SMS.exe` |
| `npm run desktop:dist` | Installer → `electron/release/Viste-SMS-Setup-<version>.exe` |
| `npm run desktop:version -- patch\|minor\|major` | Bump desktop version |

Local desktop testing:

```bash
npm run desktop:install      # once
npm run dev                  # terminal 1
npm run electron:dev         # terminal 2 (DevTools available via View menu)
```

## Versioning

The desktop version lives in **`electron/package.json` → `version`** (semver) and is what
the app reports (Help → About, installer name, auto-update).

| Change | Command | Example |
| --- | --- | --- |
| Bug fix | `npm run desktop:version -- patch` | 1.0.0 → 1.0.1 |
| New feature | `npm run desktop:version -- minor` | 1.0.1 → 1.1.0 |
| Breaking change | `npm run desktop:version -- major` | 1.1.0 → 2.0.0 |

Versions only move forward; the script refuses to go backwards.

## Releasing a desktop update

```bash
npm run desktop:version -- minor          # e.g. 1.0.0 -> 1.1.0
git add electron/package.json
git commit -m "Desktop v1.1.0"
git tag v1.1.0
git push origin main --follow-tags
```

GitHub Actions (`desktop-release.yml`) then:

1. typechecks, runs unit tests and builds the web app;
2. checks the tag (`v1.1.0`) matches `electron/package.json`;
3. builds `Viste-SMS-Setup-1.1.0.exe` on Windows;
4. publishes GitHub Release **v1.1.0** with the installer, `.blockmap` and `latest.yml`.

Installed apps check for updates ~8 seconds after launch and every 4 hours, download
the new version in the background, then show **Update Ready → Restart & Update / Later**.
Choosing *Later* installs it automatically the next time the app is closed.

Ordinary pushes to `main` (no tag) still run validation and build an installer you can
download from the workflow run's **Artifacts** for testing — they do **not** publish a
release, so installed apps are never updated by an untested push.

## Distributing to the school

Always share the **latest release page** — it never changes and always points at the
newest installer:

**https://github.com/Tawa58/viste-sms/releases/latest**

Under *Assets*, download `Viste-SMS-Setup-<version>.exe` (the only file users need; the
`.blockmap` and `latest.yml` files are for the auto-updater). You can also copy the `.exe`
to a USB drive or shared folder and install it on each school PC. Once installed, PCs
update themselves — you only redistribute the installer for new machines.

## First-time installation for users

Download `Viste-SMS-Setup-<version>.exe` from the repository's
[Releases](https://github.com/Tawa58/viste-sms/releases) page and run it. It installs per
user (no admin rights needed) to `%LOCALAPPDATA%\Programs\Viste SMS`, adds Start Menu and
desktop shortcuts, and appears in *Apps & features* for normal uninstall.

The installer is **not code-signed**, so Windows SmartScreen shows "Windows protected your
PC" on first install → *More info* → *Run anyway*. To remove the warning, buy a Windows
code-signing certificate and add `CSC_LINK` / `CSC_KEY_PASSWORD` secrets (electron-builder
signs automatically when they are present).

## Rollback

- Updates are verified (sha512 in `latest.yml`) before install; a failed or interrupted
  download never touches the installed app, which keeps running the current version.
- The updater never downgrades. To undo a bad release, **publish a newer version** with the
  fix or reverted code (e.g. bad `1.1.0` → revert → `npm run desktop:version -- patch` →
  tag `v1.1.1`). Installed apps move to `1.1.1` automatically.
- To stop a bad release spreading while you fix it, edit it on GitHub and mark it as a
  **pre-release** (or delete its `latest.yml` asset); the updater then treats the previous
  release as latest. Old releases are never deleted automatically, so any previous installer
  stays downloadable for manual reinstall.

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`,
  no `<webview>`; the renderer has no Node.js access.
- Navigation is locked to the app origin; other links open in the default browser.
  Only same-origin, `about:blank` and `blob:` popups (print previews, receipts) are allowed.
- All permission requests are denied except clipboard write (copy buttons) and fullscreen.
- Nothing secret is bundled: Firebase **client** config is public by design; the Firebase
  **Admin** credentials stay only in Vercel environment variables.
- Security continues to rely on Firebase Authentication, Firestore rules (default deny)
  and server-side authorization in `/api/v1` — exactly as on the web.

## GitHub configuration

No extra secrets are required. The workflow uses the built-in `GITHUB_TOKEN` (granted
`contents: write` only in the desktop job) to create releases. The repository must remain
**public** for installed apps to read releases without a token.

Optional: `CSC_LINK` and `CSC_KEY_PASSWORD` for code signing (see above).

## Printing, PDFs and downloads

Existing flows work unchanged: jsPDF downloads open a Windows *Save as* dialog; print
previews (attendance register, portal code slips) open in a popup and use the Windows
print dialog. **File → Print… (Ctrl+P)** prints the current page. The preload bridge
(`window.visteDesktop`) is where future direct-printer or offline features can be added
without changing the web UI.

## Troubleshooting

- Logs: `%APPDATA%\Viste SMS\logs\main.log` (startup, load failures, updater activity).
- No internet: the app shows a "Can't reach Viste SMS" screen and reconnects automatically.
- Help → **Check for updates…** runs a manual update check.
