const { spawn } = require('node:child_process');
const { join } = require('node:path');

const nodejsDir = join(__dirname, 'nodejs');
const child = process.platform === 'win32'
  ? spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
      cwd: nodejsDir,
      stdio: 'inherit',
      shell: false,
    })
  : spawn('npm', ['run', 'dev'], {
      cwd: nodejsDir,
      stdio: 'inherit',
      shell: false,
    });

function forwardSignal(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('error', error => {
  console.error(error);
  process.exit(1);
});

child.on('exit', code => {
  process.exit(code ?? 0);
});