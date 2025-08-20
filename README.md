# ccheatmap

Terminal-based GitHub-style contribution heatmap for Claude Code usage.

![Claude Code Heatmap](https://img.shields.io/badge/Claude-Code-blue)
![npm version](https://img.shields.io/npm/v/ccheatmap)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- 📊 GitHub-style contribution heatmap in your terminal
- 📈 Track sessions, tokens, or interactions
- 🎨 Beautiful colored output with intensity levels
- 📅 Configurable time ranges
- 📊 Statistics including streaks and totals
- 🔧 Zero configuration required

## Quick Start

Run directly with npx (no installation required):

```bash
npx ccheatmap
```

## Installation

If you prefer to install globally:

```bash
npm install -g ccheatmap
```

Then run:

```bash
ccheatmap
```

## Usage

### Basic Usage

```bash
# Show default heatmap (sessions for last 365 days)
npx ccheatmap

# Show token usage heatmap
npx ccheatmap --metric tokens

# Show interaction count heatmap
npx ccheatmap --metric interactions

# Show last 90 days
npx ccheatmap --days 90

# Output as JSON
npx ccheatmap --json
```

### Options

- `-m, --metric <type>`: Metric to visualize (`sessions`, `tokens`, or `interactions`). Default: `sessions`
- `-d, --days <number>`: Number of days to show. Default: `365`
- `--no-legend`: Hide the intensity legend
- `--no-stats`: Hide statistics
- `--no-months`: Hide month labels
- `--json`: Output raw data as JSON
- `-h, --help`: Display help
- `-V, --version`: Display version

## Examples

### Session Activity Heatmap
```bash
npx ccheatmap --metric sessions
```
Shows the number of unique Claude Code sessions per day.

### Token Usage Heatmap
```bash
npx ccheatmap --metric tokens
```
Visualizes total token consumption (input + output + cache) per day.

### Interaction Count Heatmap
```bash
npx ccheatmap --metric interactions
```
Displays the number of interactions with Claude Code per day.

### Export Data as JSON
```bash
npx ccheatmap --json > claude-usage.json
```
Exports the raw usage data for further analysis.

## Data Location

The tool automatically searches for Claude Code data in:
- `~/.config/claude/projects/` (default location)
- `~/.claude/projects/` (legacy location)
- Custom paths via `CLAUDE_CONFIG_DIR` environment variable

## Requirements

- Node.js 18.0.0 or higher
- Claude Code must be installed and have usage history

## License

MIT

## Author

Vivek

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [ccusage](https://github.com/ryoppippi/ccusage) - Comprehensive Claude Code usage analysis tool