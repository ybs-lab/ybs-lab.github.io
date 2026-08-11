# IQ Puzzler Pro (5x11) — all solutions viewer

Interactive viewer for all 1,082,785 solutions of the SmartGames IQ Puzzler Pro
5x11 board (unique up to board rotation/mirror; 4,331,140 total counting the 4
symmetry variants, selectable in the UI).

## Files
- `index.html` — self-contained viewer (canvas rendering, slider, keyboard navigation)
- `solutions.bin` — all solutions, delta-encoded (15 MB)

## Format of solutions.bin
Solutions are in exact-cover DFS order. Per solution: one byte `d` = number of
leading piece placements shared with the previous solution, then `12-d`
little-endian uint16 indices into the global placement table (embedded in
index.html; each index maps to a piece id and its 3-5 board cells).

## Hosting
Needs to be served over HTTP (fetch() cannot read local files):
- GitHub Pages: push both files, enable Pages on the repo. Done.
- Locally: `python3 -m http.server` in this directory, open http://localhost:8000
