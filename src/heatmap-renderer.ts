import chalk from 'chalk';
import { format, startOfWeek, addDays, isSameDay, differenceInWeeks } from 'date-fns';

export type HeatmapMetric = 'sessions' | 'tokens' | 'interactions';

export interface HeatmapOptions {
  metric: HeatmapMetric;
  days: number;
  showLegend: boolean;
  showStats: boolean;
  showMonths: boolean;
}

interface Cell {
  date: Date;
  value: number;
  intensity: number;
}

export class HeatmapRenderer {
  private readonly intensityChars = [' ', '■', '■', '■', '■'];
  // GitHub's actual green color palette
  private readonly intensityColors = [
    (s: string) => s, // No color for empty cells
    chalk.hex('#1B4721'), // Darkest green (low activity)
    chalk.hex('#1A4420'), // Dark green
    chalk.hex('#2A6A30'), // Medium green  
    chalk.hex('#6BC46D')  // Brightest green (high activity)
  ];

  render(
    activityData: Map<string, any>,
    options: HeatmapOptions
  ): string {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - options.days + 1); // Include today

    // Build grid of cells
    const cells = this.buildCellGrid(activityData, startDate, endDate, options.metric);
    
    // Calculate intensity levels
    this.calculateIntensityLevels(cells);

    // Render the heatmap
    const output: string[] = [];
    
    // Title
    output.push('');
    output.push(chalk.bold.cyan(`        Claude Code Activity - ${this.getMetricLabel(options.metric)}`));
    output.push('');

    // Month labels
    if (options.showMonths) {
      output.push(this.renderMonthLabels(cells));
    }

    // Day labels and grid
    output.push(this.renderGrid(cells));

    // Legend
    if (options.showLegend) {
      output.push(this.renderLegend());
    }

    // Stats
    if (options.showStats) {
      output.push(this.renderStats(activityData, options.metric));
    }

    return output.join('\n');
  }

  private buildCellGrid(
    activityData: Map<string, any>,
    startDate: Date,
    endDate: Date,
    metric: HeatmapMetric
  ): Cell[][] {
    // Get terminal width (default to 80 if not available)
    const terminalWidth = process.stdout.columns || 80;
    
    // Calculate max weeks based on terminal width
    // Each cell takes 2 chars (char + space), plus 4 for day labels
    const maxWeeksForWidth = Math.floor((terminalWidth - 4) / 2);
    
    // Calculate the grid start date (beginning of week for startDate)
    const gridStartDate = startOfWeek(startDate, { weekStartsOn: 0 });
    
    // Calculate the grid end date (end of week for endDate)
    const gridEndDate = startOfWeek(endDate, { weekStartsOn: 0 });
    gridEndDate.setDate(gridEndDate.getDate() + 6); // End of week
    
    // Build all potential weeks first
    const allWeeks: Cell[][] = [];
    let currentWeekStart = new Date(gridStartDate);
    
    while (currentWeekStart <= gridEndDate) {
      const weekCells: Cell[] = [];
      let hasValidDay = false;
      
      for (let day = 0; day < 7; day++) {
        const cellDate = addDays(currentWeekStart, day);
        const dateKey = cellDate.toISOString().split('T')[0];
        const activity = activityData.get(dateKey);
        
        let value = 0;
        if (activity) {
          switch (metric) {
            case 'sessions':
              value = activity.sessions.size;
              break;
            case 'tokens':
              value = activity.tokens;
              break;
            case 'interactions':
              value = activity.interactions;
              break;
          }
        }
        
        // Check if this cell is within our date range
        if (cellDate >= startDate && cellDate <= endDate) {
          hasValidDay = true;
          weekCells.push({
            date: cellDate,
            value,
            intensity: 0
          });
        } else if (cellDate > endDate) {
          // Future date (part of the current week but after endDate)
          // Still include it in the grid to maintain alignment
          weekCells.push({
            date: cellDate,
            value: 0,
            intensity: 0 // Show as empty square, not space
          });
        } else {
          // Past date before our range
          weekCells.push({
            date: cellDate,
            value: 0,
            intensity: -1 // Mark as outside range (will show as space)
          });
        }
      }
      
      // Only include weeks that have at least one valid day
      if (hasValidDay) {
        allWeeks.push(weekCells);
      }
      
      // Move to next week
      currentWeekStart = addDays(currentWeekStart, 7);
    }
    
    // Limit to terminal width and avoid month wraparound
    const weeksToShow = Math.min(allWeeks.length, maxWeeksForWidth);
    
    // If we need to limit, take the most recent weeks
    if (weeksToShow < allWeeks.length) {
      return allWeeks.slice(allWeeks.length - weeksToShow);
    }
    
    return allWeeks;
  }

  private calculateIntensityLevels(cells: Cell[][]): void {
    // Collect all non-zero values (excluding future dates)
    const values: number[] = [];
    for (const week of cells) {
      for (const cell of week) {
        if (cell.intensity !== -1 && cell.value > 0) {
          values.push(cell.value);
        }
      }
    }
    
    if (values.length === 0) return;
    
    // Calculate quartiles
    values.sort((a, b) => a - b);
    const q1 = values[Math.floor(values.length * 0.25)];
    const q2 = values[Math.floor(values.length * 0.5)];
    const q3 = values[Math.floor(values.length * 0.75)];
    
    // Assign intensity levels
    for (const week of cells) {
      for (const cell of week) {
        // Skip future dates
        if (cell.intensity === -1) continue;
        
        if (cell.value === 0) {
          cell.intensity = 0;
        } else if (cell.value <= q1) {
          cell.intensity = 1;
        } else if (cell.value <= q2) {
          cell.intensity = 2;
        } else if (cell.value <= q3) {
          cell.intensity = 3;
        } else {
          cell.intensity = 4;
        }
      }
    }
  }

  private renderMonthLabels(cells: Cell[][]): string {
    // Start with padding for day labels (7 chars + space for the new padding)
    let result = '        ';
    let lastSeenMonth = -1;
    
    for (let weekIdx = 0; weekIdx < cells.length; weekIdx++) {
      const week = cells[weekIdx];
      
      // Count valid days per month in this week
      const monthCounts = new Map<number, number>();
      for (const cell of week) {
        if (cell.intensity !== -1) {
          const month = cell.date.getMonth();
          monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
        }
      }
      
      if (monthCounts.size === 0) {
        // No valid days in this week
        result += ' ';
      } else {
        // Find the dominant month (the one with most days)
        let dominantMonth = -1;
        let maxCount = 0;
        
        for (const [month, count] of monthCounts) {
          if (count > maxCount) {
            dominantMonth = month;
            maxCount = count;
          }
        }
        
        // Only show month label if:
        // 1. It's different from the last month we showed
        // 2. This month has at least 4 days in this week (majority of week)
        if (dominantMonth !== lastSeenMonth && maxCount >= 4) {
          result += String(dominantMonth + 1);
          lastSeenMonth = dominantMonth;
        } else {
          result += ' ';
        }
      }
      
      // Add space to match grid spacing (cells are separated by spaces)
      if (weekIdx < cells.length - 1) {
        result += ' ';
      }
    }
    
    return result;
  }

  private renderGrid(cells: Cell[][]): string {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const lines: string[] = [];
    const today = new Date();
    
    // Debug: log grid structure
    if (process.env.DEBUG_GRID) {
      console.error('Grid has', cells.length, 'weeks');
      cells.forEach((week, weekIdx) => {
        console.error(`Week ${weekIdx}:`);
        week.forEach((cell, dayIdx) => {
          console.error(`  ${dayLabels[dayIdx]}: intensity=${cell.intensity}, date=${cell.date.toISOString().split('T')[0]}`);
        });
      });
    }
    
    for (let day = 0; day < 7; day++) {
      // Add more padding before day labels
      const cells_str: string[] = ['    ' + chalk.gray(dayLabels[day])];
      
      for (const week of cells) {
        const cell = week[day];
        
        // Handle past dates before our range
        if (cell.intensity === -1) {
          cells_str.push(' ');
        } else {
          const char = this.intensityChars[cell.intensity];
          const color = this.intensityColors[cell.intensity];
          
          // Highlight today
          if (isSameDay(cell.date, today)) {
            cells_str.push(chalk.inverse(color(char)));
          } else {
            cells_str.push(color(char));
          }
        }
      }
      
      lines.push(cells_str.join(' '));
    }
    
    return lines.join('\n');
  }

  private renderLegend(): string {
    const legend = ['        Less '];
    
    for (let i = 0; i < this.intensityChars.length; i++) {
      legend.push(this.intensityColors[i](this.intensityChars[i]));
    }
    
    legend.push(' More');
    
    // Add a blank line before the legend for better separation
    return '\n' + legend.join(' ');
  }

  private renderStats(activityData: Map<string, any>, metric: HeatmapMetric): string {
    let totalDays = 0;
    let totalValue = 0;
    let maxValue = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Convert to sorted array
    const sortedDates = Array.from(activityData.keys()).sort();
    
    // Calculate stats
    for (let i = 0; i < sortedDates.length; i++) {
      const activity = activityData.get(sortedDates[i])!;
      let value = 0;
      
      switch (metric) {
        case 'sessions':
          value = activity.sessions.size;
          break;
        case 'tokens':
          value = activity.tokens;
          break;
        case 'interactions':
          value = activity.interactions;
          break;
      }
      
      if (value > 0) {
        totalDays++;
        totalValue += value;
        maxValue = Math.max(maxValue, value);
        
        // Check streak
        if (i === 0 || this.isConsecutive(sortedDates[i - 1], sortedDates[i])) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }
    }
    
    // Check if current streak is ongoing
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    
    if (sortedDates.includes(today) || sortedDates.includes(yesterdayKey)) {
      currentStreak = tempStreak;
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
    
    const metricLabel = this.getMetricLabel(metric).toLowerCase();
    const stats = [
      '',
      chalk.bold('        Statistics:'),
      `        ${chalk.cyan('Active:')} ${totalDays} days  ${chalk.cyan('Streak:')} ${currentStreak}/${longestStreak} days`,
      `        ${chalk.cyan(`Total ${metricLabel}:`)} ${this.formatNumber(totalValue)}  ${chalk.cyan('Max:')} ${this.formatNumber(maxValue)} ${metricLabel}/day`
    ];
    
    return stats.join('\n');
  }

  private isConsecutive(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  private getMetricLabel(metric: HeatmapMetric): string {
    switch (metric) {
      case 'sessions':
        return 'Sessions';
      case 'tokens':
        return 'Tokens';
      case 'interactions':
        return 'Interactions';
      default:
        return metric;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }
}