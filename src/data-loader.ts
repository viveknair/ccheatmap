import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

export interface UsageEntry {
  timestamp: string;
  sessionId: string;
  type: string;
  message?: {
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
  };
}

export interface DailyActivity {
  date: string;
  sessions: Set<string>;
  interactions: number;
  tokens: number;
}

export class DataLoader {
  private claudePaths: string[];

  constructor() {
    this.claudePaths = this.findClaudePaths();
    if (process.env.DEBUG) {
      console.log('Found Claude paths:', this.claudePaths);
    }
  }

  private findClaudePaths(): string[] {
    const paths: string[] = [];
    const home = homedir();
    
    // Check environment variable first
    const envPath = process.env.CLAUDE_CONFIG_DIR;
    if (envPath) {
      const envPaths = envPath.split(',').map(p => p.trim()).filter(Boolean);
      for (const path of envPaths) {
        const projectsPath = join(path, 'projects');
        if (existsSync(projectsPath)) {
          paths.push(projectsPath);
        }
      }
    }

    // Check default locations
    const defaultPaths = [
      join(home, '.config', 'claude', 'projects'),
      join(home, '.claude', 'projects')
    ];

    for (const path of defaultPaths) {
      if (existsSync(path) && !paths.includes(path)) {
        paths.push(path);
      }
    }

    return paths;
  }

  async loadUsageData(days: number = 365): Promise<Map<string, DailyActivity>> {
    const activityMap = new Map<string, DailyActivity>();
    const endDate = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(endDate.getDate() - days);

    for (const claudePath of this.claudePaths) {
      await this.processDirectory(claudePath, activityMap, cutoffDate);
    }

    if (process.env.DEBUG) {
      console.log('Activity map size:', activityMap.size);
      console.log('Cutoff date:', cutoffDate.toISOString());
    }

    return activityMap;
  }

  private async processDirectory(
    dirPath: string,
    activityMap: Map<string, DailyActivity>,
    cutoffDate: Date
  ): Promise<void> {
    try {
      const projects = await readdir(dirPath);
      
      if (process.env.DEBUG) {
        console.log(`Found ${projects.length} projects in ${dirPath}`);
      }
      
      for (const project of projects) {
        const projectPath = join(dirPath, project);
        const projectStat = await stat(projectPath);
        
        if (!projectStat.isDirectory()) continue;

        const files = await readdir(projectPath);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
        
        if (process.env.DEBUG) {
          console.log(`  Project ${project}: ${jsonlFiles.length} JSONL files`);
        }
        
        for (const file of jsonlFiles) {
          const filePath = join(projectPath, file);
          const sessionId = file.replace('.jsonl', '');
          await this.processJsonlFile(filePath, project, sessionId, activityMap, cutoffDate);
        }
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.error('Error processing directory:', dirPath, error);
      }
    }
  }


  private async processJsonlFile(
    filePath: string,
    project: string,
    session: string,
    activityMap: Map<string, DailyActivity>,
    cutoffDate: Date
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      if (process.env.DEBUG) {
        console.log(`Processing file: ${filePath}, lines: ${lines.length}`);
      }

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as UsageEntry;
          const entryDate = new Date(entry.timestamp);
          
          if (entryDate < cutoffDate) {
            if (process.env.DEBUG_DATES) {
              console.log(`Skipping old entry: ${entry.timestamp} < ${cutoffDate.toISOString()}`);
            }
            continue;
          }

          const dateKey = entryDate.toISOString().split('T')[0];
          
          if (!activityMap.has(dateKey)) {
            activityMap.set(dateKey, {
              date: dateKey,
              sessions: new Set(),
              interactions: 0,
              tokens: 0
            });
          }

          const dayActivity = activityMap.get(dateKey)!;
          dayActivity.sessions.add(`${project}/${session}`);
          dayActivity.interactions++;
          
          if (process.env.DEBUG_DATES) {
            console.log(`Added activity for ${dateKey}`);
          }

          if (entry.message?.usage) {
            const usage = entry.message.usage;
            dayActivity.tokens += (usage.input_tokens || 0) + 
                                  (usage.output_tokens || 0) +
                                  (usage.cache_creation_input_tokens || 0) +
                                  (usage.cache_read_input_tokens || 0);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
}