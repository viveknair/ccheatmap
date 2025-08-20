#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { DataLoader } from './data-loader';
import { HeatmapRenderer, HeatmapOptions } from './heatmap-renderer';

async function main() {
  program
    .name('ccheatmap')
    .description('Terminal-based GitHub-style contribution heatmap for Claude Code usage')
    .version('1.0.0')
    .option('-m, --metric <type>', 'Metric to visualize: sessions, tokens, or interactions', 'sessions')
    .option('-d, --days <number>', 'Number of days to show', '365')
    .option('--no-legend', 'Hide the intensity legend')
    .option('--no-stats', 'Hide statistics')
    .option('--no-months', 'Hide month labels')
    .option('--json', 'Output raw data as JSON')
    .parse(process.argv);

  const options = program.opts();
  
  // Validate metric
  const validMetrics = ['sessions', 'tokens', 'interactions'];
  if (!validMetrics.includes(options.metric)) {
    console.error(chalk.red(`Invalid metric: ${options.metric}`));
    console.error(chalk.yellow(`Valid metrics are: ${validMetrics.join(', ')}`));
    process.exit(1);
  }

  // Parse days
  const days = parseInt(options.days);
  if (isNaN(days) || days < 1) {
    console.error(chalk.red('Days must be a positive number'));
    process.exit(1);
  }

  try {
    // Load data
    const loader = new DataLoader();
    const activityData = await loader.loadUsageData(days);

    if (activityData.size === 0) {
      console.log(chalk.yellow('\nNo Claude Code usage data found.'));
      console.log(chalk.gray('Make sure Claude Code is installed and has been used.'));
      console.log(chalk.gray('Data is typically stored in ~/.config/claude/projects/ or ~/.claude/projects/'));
      process.exit(0);
    }

    // Output JSON if requested
    if (options.json) {
      const jsonData: any = {};
      for (const [date, activity] of activityData) {
        jsonData[date] = {
          sessions: Array.from(activity.sessions),
          interactions: activity.interactions,
          tokens: activity.tokens
        };
      }
      console.log(JSON.stringify(jsonData, null, 2));
      return;
    }

    // Render heatmap
    const renderer = new HeatmapRenderer();
    const heatmapOptions: HeatmapOptions = {
      metric: options.metric as any,
      days,
      showLegend: options.legend !== false,
      showStats: options.stats !== false,
      showMonths: options.months !== false
    };

    const output = renderer.render(activityData, heatmapOptions);
    console.log(output);

  } catch (error) {
    console.error(chalk.red('Error generating heatmap:'), error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});