import { spawn } from 'node:child_process';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const redis = spawn('docker', ['compose', 'up', '-d', 'redis'], { stdio: 'inherit' });

redis.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const services = spawn(command, ['-r', '--parallel', '--workspace-concurrency=1', 'run', 'dev'], {
    stdio: 'inherit',
  });

  const stop = () => services.kill('SIGTERM');
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  services.on('exit', (serviceCode) => process.exit(serviceCode ?? 0));
});
