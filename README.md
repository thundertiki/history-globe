# History Globe

Pick a date and see the world's political borders on a 3D globe, from 3000 BC to today. Tap a country for its
name at that time, its status and capital (from 1886), and a Wikipedia summary.

- Before 1886: about 40 world snapshots ([historical-basemaps](https://github.com/aourednik/historical-basemaps)),
  so borders snap to the latest snapshot at or before the date.
- 1886 to 2019: borders change on the exact day ([CShapes 2.0](https://icr.ethz.ch/data/cshapes/)).
- From 2020: present-day borders ([Natural Earth](https://www.naturalearthdata.com/)).

## Download

**[Latest release →](https://github.com/thundertiki/history-globe/releases/latest)**

| Platform | File | Notes |
|---|---|---|
| Windows 10/11 (64-bit) | [History-Globe-Setup-0.1.1-x64.exe](https://github.com/thundertiki/history-globe/releases/download/v0.1.1/History-Globe-Setup-0.1.1-x64.exe) | Unsigned: on the SmartScreen warning click *More info* → *Run anyway*. |
| Android 6+ | [History-Globe-0.1.1.apk](https://github.com/thundertiki/history-globe/releases/download/v0.1.1/History-Globe-0.1.1.apk) | Allow installs from your browser; if Play Protect warns, tap *More details* → *Install anyway*. |

Both work offline (only Wikipedia pictures need the internet).

## Run it
```
npm install
npm run dev
```

Tests: `npm test`. Rebuild the data: `npm run data:fetch`, then `npm run data:build` and `npm run data:entities`.

## Licences
Code: GPL-3.0-or-later. Data: see [public/data/LICENSES.md](public/data/LICENSES.md). The 1886–2019 border data is
CC BY-NC-SA 4.0, so the app is free and non-commercial.
