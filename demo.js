#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Create demo data directory
const demoDir = path.join(os.homedir(), '.config', 'claude', 'projects', 'ccheatmap-demo');

console.log('🎨 Generating demo data for ccheatmap...\n');

// Backup existing data if it exists
const backupDir = demoDir + '.backup';
if (fs.existsSync(demoDir) && !fs.existsSync(backupDir)) {
  fs.renameSync(demoDir, backupDir);
  console.log('📦 Backed up existing data');
}

// Create fresh demo directory
fs.mkdirSync(demoDir, { recursive: true });

// Generate 4 months of realistic mock data with varied intensity
const generateMockData = () => {
  const data = [];
  const now = new Date();
  
  // Go back 120 days (4 months)
  for (let i = 119; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    
    // Determine activity level for this specific day
    let activityLevel = 0;
    
    // Weekday base activity (Monday = 1, Sunday = 0)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekdays: Always have some base activity
      // Random number between 1-10 for base activity
      activityLevel = Math.floor(Math.random() * 10) + 1;
      
      // Add weekday patterns
      if (dayOfWeek === 1) {
        // Monday: moderate (ramping up)
        activityLevel *= 0.7;
      } else if (dayOfWeek === 2 || dayOfWeek === 3) {
        // Tuesday/Wednesday: highest activity
        activityLevel *= 1.2;
      } else if (dayOfWeek === 4) {
        // Thursday: still high
        activityLevel *= 1.1;
      } else if (dayOfWeek === 5) {
        // Friday: tapering off
        activityLevel *= 0.6;
      }
      
      // Add some random spikes and dips
      const randomEvent = Math.random();
      if (randomEvent < 0.1) {
        // 10% chance of very busy day
        activityLevel *= 2.5;
      } else if (randomEvent < 0.2) {
        // 10% chance of light day (meetings, etc)
        activityLevel *= 0.3;
      } else if (randomEvent < 0.4) {
        // 20% chance of above average
        activityLevel *= 1.5;
      }
      
      // Time-based patterns (project phases)
      if (i > 90) {
        // 3+ months ago: lighter usage
        activityLevel *= 0.4;
      } else if (i > 60) {
        // 2-3 months ago: ramping up
        activityLevel *= 0.7;
      } else if (i > 30) {
        // 1-2 months ago: heavy usage (main project phase)
        activityLevel *= 1.3;
      } else if (i > 14) {
        // 2-4 weeks ago: peak usage
        activityLevel *= 1.5;
      } else {
        // Last 2 weeks: current activity
        activityLevel *= 1.0;
      }
      
    } else {
      // Weekends: Much lower activity
      // 70% chance of no activity at all
      if (Math.random() > 0.7) {
        // 30% chance of weekend work
        activityLevel = Math.floor(Math.random() * 3) + 1; // 1-3 base
        
        // Saturday slightly more likely to have activity than Sunday
        if (dayOfWeek === 6) {
          activityLevel *= 1.2;
        } else {
          activityLevel *= 0.8;
        }
        
        // Weekend work is usually lighter
        activityLevel *= 0.4;
      }
    }
    
    // Vacation periods (specific date ranges with no activity)
    const isVacation = (i >= 75 && i <= 78) || // About 2.5 months ago
                      (i >= 42 && i <= 45);   // About 1.5 months ago
    
    if (isVacation) {
      activityLevel = 0;
    }
    
    // Skip if no activity
    if (activityLevel < 0.5) continue;
    
    // Convert activity level to actual metrics
    // Sessions: 1-20 range based on activity
    const sessions = Math.min(20, Math.max(1, Math.floor(activityLevel)));
    
    // Interactions and tokens scale with sessions
    const interactions = Math.floor(sessions * (20 + Math.random() * 80));
    const tokens = Math.floor(sessions * (1000000 + Math.random() * 5000000));
    
    // Generate session entries for this day
    for (let s = 0; s < sessions; s++) {
      const sessionId = `session-${date.toISOString().split('T')[0]}-${s}`;
      
      // Distribute interactions across the day
      const sessionInteractions = Math.ceil(interactions / sessions);
      const sessionTokens = Math.floor(tokens / sessions);
      
      // Add a codebase update entry for each session
      const sessionStart = new Date(date);
      sessionStart.setHours(8 + Math.floor(Math.random() * 10));
      sessionStart.setMinutes(Math.floor(Math.random() * 60));
      
      data.push({
        timestamp: sessionStart.toISOString(),
        sessionId: sessionId,
        type: 'codebaseUpdate',
        projectPath: '/Users/demo/project'
      });
      
      // Add interaction entries
      for (let j = 0; j < sessionInteractions; j++) {
        const interactionTime = new Date(sessionStart);
        interactionTime.setMinutes(sessionStart.getMinutes() + j * 2);
        
        data.push({
          timestamp: interactionTime.toISOString(),
          sessionId: sessionId,
          type: 'assistantMessage',
          message: {
            usage: {
              input_tokens: Math.floor(sessionTokens * 0.3 / sessionInteractions),
              output_tokens: Math.floor(sessionTokens * 0.5 / sessionInteractions),
              cache_creation_input_tokens: Math.floor(sessionTokens * 0.1 / sessionInteractions),
              cache_read_input_tokens: Math.floor(sessionTokens * 0.1 / sessionInteractions)
            },
            model: 'claude-3-5-sonnet-20241022'
          }
        });
      }
    }
  }
  
  return data;
};

// Generate and write the mock data
const mockData = generateMockData();
const outputFile = path.join(demoDir, 'usage.jsonl');
const jsonlContent = mockData.map(entry => JSON.stringify(entry)).join('\n');
fs.writeFileSync(outputFile, jsonlContent);

console.log(`✅ Generated ${mockData.length.toLocaleString()} activity entries`);
console.log(`📍 Data location: ${demoDir}\n`);
console.log('━'.repeat(60) + '\n');

// Run ccheatmap with the demo data
const args = process.argv.slice(2);
const ccheatmapPath = path.join(__dirname, 'dist', 'index.js');

// Check if built version exists
if (!fs.existsSync(ccheatmapPath)) {
  console.error('❌ Please run "npm run build" first to build the project');
  process.exit(1);
}

// Spawn ccheatmap with passed arguments
const child = spawn('node', [ccheatmapPath, ...args], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('exit', (code) => {
  // Optionally restore backup
  if (fs.existsSync(backupDir)) {
    console.log('\n━'.repeat(60));
    console.log('\n💡 To restore your original data, run:');
    console.log(`   rm -rf ${demoDir}`);
    console.log(`   mv ${backupDir} ${demoDir}`);
  }
  process.exit(code);
});