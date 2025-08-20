# ccheatmap Demo

This folder contains demo utilities for ccheatmap.

## Files

- `generate.js` - Generates realistic mock Claude Code usage data and runs ccheatmap
- `index.html` - Static HTML preview with styled heatmap visualization

## Usage

### Generate and display mock data

From the project root:
```bash
npm run build
node demo/generate.js
```

Or with options:
```bash
node demo/generate.js --year
node demo/generate.js -m tokens
node demo/generate.js -d 30
```

### View HTML preview

```bash
open demo/index.html
```

## How it works

The demo generator creates realistic usage patterns including:
- Heavy weekday activity (peak on Tue/Wed/Thu)
- Sparse weekend activity (70% of weekends have no activity)
- Vacation periods with gaps
- Project phases with varying intensity
- Random busy and quiet days

The generated data is placed in `~/.config/claude/projects/ccheatmap-demo/` and your real data (if any) is backed up first.