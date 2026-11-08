---
name: hg-release
description: Release a new History Globe version - bump the version, build the Windows installer, Android APK and Claude artifact, republish the artifact, tag, create the GitHub release and update the README Download table. Use when Ben asks to release, ship, publish or "make installers" for history-globe after a change.
---

# Release History Globe

Run from `history-globe`. Use `npm --prefix <repo>` and absolute paths (no `cd <path> &&`).

## Steps
1. **Check:** `npx tsc -p <repo>` and `npx vitest run --root <repo>` pass; `git status` shows only this change.
2. **Version:** bump `version` in `package.json` (patch for fixes, minor for features).
3. **Build all three** (each writes to `release/` or `dist-artifact/`):
   - `npm run dist:win` → `release/History-Globe-Setup-<v>-x64.exe`
   - `npm run dist:android` → `release/History-Globe-<v>.apk` (paths in git-ignored
     `pipeline/android-build.local.json`)
   - `npm run build:artifact` → `dist-artifact/page.html` + `files.json`
4. **Artifact:** publish `dist-artifact/page.html` with `root: history-globe/dist-artifact` to the same URL
   (https://claude.ai/artifact/3Ck65tQB94o5MNWLYACfxv). Pass only changed files in `files` (always `app.js`,
   `app.css`; plus any `data/...` the change touched; `files.json` lists them all). Untouched files are kept. The tool may refuse until it has seen the live
   version and the old `app.js`/`app.css`: publish again, then pass `overwrite_unread: ["app.js", "app.css"]`
   (they are build outputs of this repo, so replacing them is the point).
5. **README:** replace the old version number in the Download table (`sed s/<old>/<new>/g README.md`).
6. **Commit and push**, then `git tag v<v>` and `git push origin v<v>`.
7. **GitHub release:** `gh release create v<v> --repo thundertiki/history-globe --title "History Globe <v>"`
   with both installers, and notes in this shape: **New/Fixes** (Ben's words, user-facing), then **Downloads**
   with the SmartScreen ("More info → Run anyway") and Play Protect ("More details → Install anyway") tips.
8. **Report:** the release link, what changed, and what was not tested on a real phone.

## Notes
- The APK is debug-signed; it installs over earlier versions built on this PC.
- New data files need a `public/data/LICENSES.md` row and, if user-visible, an About panel line.
- The repo is public: no personal paths, emails or secrets in commits.
