const { spawn } = require('child_process');
const http = require('http');

// Health check para Railway
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('OK');
});
server.listen(process.env.PORT || 8080);

const game = spawn('node', ['cli/index.js'], { stdio: 'inherit' });
const console_ = spawn('node', ['console/index.js'], { stdio: 'inherit' });

game.on('close', (code) => process.exit(code));