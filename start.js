const { spawn } = require('child_process');

const game = spawn('node', ['cli/index.js'], { stdio: 'inherit' });
const console_ = spawn('node', ['console/index.js'], { stdio: 'inherit' });

game.on('close', (code) => process.exit(code));