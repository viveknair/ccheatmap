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

// Generate 4 months of realistic mock data
const generateMockData = () => {
  const data = [];
  const now = new Date();
  
  // Go back 120 days (4 months)
  for (let i = 119; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString();
    
    // Create varying intensity patterns
    let sessions = 0;
    let interactions = 0;
    let tokens = 0;
    
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const monthNum = date.getMonth();
    
    // Skip some weekends randomly (30% chance of weekend work)
    if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.3) {
      continue;
    }
    
    // Create intensity patterns based on different factors
    let baseLevel = 1;
    
    // Month-based patterns (simulate project phases)
    const monthsAgo = Math.floor(i / 30);
    switch(monthsAgo) {
      case 3: // 3 months ago - light usage
        baseLevel = 1.5;
        break;
      case 2: // 2 months ago - ramping up
        baseLevel = 2.5;
        break;
      case 1: // 1 month ago - heavy usage (project sprint)
        baseLevel = 4;
        break;
      case 0: // Current month - very active
        baseLevel = 3.5;
        break;
    }
    
    // Weekly patterns (more activity mid-week)
    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      baseLevel *= 1.3;
    }
    
    // Add some randomness
    const randomFactor = 0.5 + Math.random();
    baseLevel *= randomFactor;
    
    // Calculate activity based on patterns
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekdays
      sessions = Math.max(1, Math.floor(Math.random() * 3 * baseLevel) + Math.floor(baseLevel));
      interactions = Math.floor(Math.random() * 150 * baseLevel) + 50 * baseLevel;
      tokens = Math.floor(Math.random() * 8000000 * baseLevel) + 2000000 * baseLevel;
    } else {
      // Weekends (when active)
      sessions = Math.max(1, Math.floor(Math.random() * 2 * baseLevel));
      interactions = Math.floor(Math.random() * 80 * baseLevel) + 20 * baseLevel;
      tokens = Math.floor(Math.random() * 4000000 * baseLevel) + 1000000 * baseLevel;
    }
    
    // Create some "burst" days (10% chance)
    if (Math.random() > 0.9) {
      sessions = Math.min(sessions * 2, 20);
      interactions *= 2.5;
      tokens *= 3;
    }
    
    // Generate session entries for this day
    for (let s = 0; s < sessions; s++) {
      const sessionId = `session-${date.toISOString().split('T')[0]}-${s}`;
      
      // Distribute interactions and tokens across sessions
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