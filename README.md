# ccheatmap

Terminal-based GitHub-style contribution heatmap for Claude Code usage.

![Claude Code Heatmap](https://img.shields.io/badge/Claude-Code-blue)
![npm version](https://img.shields.io/npm/v/ccheatmap)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Quick Start

```bash
npx ccheatmap
```

## Installation

```bash
npm install -g ccheatmap
```

## Usage

```bash
# Show last 2 months (default)
ccheatmap

# Show full year
ccheatmap --year

# Show different metrics
ccheatmap -m tokens
ccheatmap -m interactions

# Custom time range
ccheatmap -d 30

# Export as JSON
ccheatmap --json > data.json
```

## Options

- `-m, --metric <type>`: `sessions`, `tokens`, or `interactions` (default: `sessions`)
- `-d, --days <number>`: Number of days to show (default: `60`)
- `--year`: Show full year (365 days)
- `--no-legend`: Hide intensity legend
- `--no-stats`: Hide statistics
- `--no-months`: Hide month labels
- `--json`: Output raw data as JSON

## Requirements

- Node.js 18.0.0+
- Claude Code with usage history

## Data Location

Automatically finds Claude Code data in:
- `~/.config/claude/projects/`
- `~/.claude/projects/`
- Custom path via `CLAUDE_CONFIG_DIR`

## Author

Vivek Nair (vnair611@gmail.com)

## License

MIT