# Lo Shu Grid Date Finder

> **Mulank & Bhagyank Calculator** — Find dates whose Lo Shu Grid contains your chosen numbers.

## What It Does

1. **Select numbers (1–9)** you want present in the Lo Shu Grid
2. **Set a start date** — the end date is auto-calculated as **18 years before today**
3. **Search** — the app finds every date in that range where your selected numbers all appear in the grid

### How Numbers Enter the Grid

A date's Lo Shu Grid is populated by:

- **Date digits**: Every non-zero digit from DD-MM-YYYY (e.g., 28-03-1990 → 2, 8, 3, 1, 9, 9)
- **Mulank (Root Number)**: Day reduced to a single digit (e.g., 28 → 2+8=10 → 1+0=**1**)
- **Bhagyank (Destiny Number)**: Full date reduced to a single digit (e.g., 2+8+0+3+1+9+9+0=32 → 3+2=**5**)

### Lo Shu Grid Layout

```
┌───┬───┬───┐
│ 4 │ 9 │ 2 │
├───┼───┼───┤
│ 3 │ 5 │ 7 │
├───┼───┼───┤
│ 8 │ 1 │ 6 │
└───┴───┴───┘
```

## Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set **Source** to `main` branch, root `/`
4. Your site will be live at `https://<username>.github.io/<repo-name>/`

## Tech

- Pure HTML, CSS, JavaScript — no build step needed
- Responsive, dark-themed UI with glassmorphism
- No external dependencies (except Google Fonts)

## License

MIT
