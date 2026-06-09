import pty from 'node-pty';
import { execSync } from 'child_process';

const roomId = 'test-room';
const containerName = `codehive-term-${roomId}`;

const createTerminal = (id) => {
  let args;
  try {
    // Check if container exists and is running
    execSync(`docker inspect -f '{{.State.Running}}' ${containerName}`, { stdio: 'pipe' });
    // It exists, use docker exec
    args = [
      'exec',
      '-it',
      containerName,
      '/bin/sh'
    ];
    console.log(`[Term ${id}] Using docker exec`);
  } catch (err) {
    // Container does not exist, use docker run
    args = [
      'run',
      '-it',
      '--rm',
      '--name', containerName,
      'node:20-alpine',
      '/bin/sh'
    ];
    console.log(`[Term ${id}] Using docker run`);
  }

  try {
    const ptyProcess = pty.spawn('docker', args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    ptyProcess.onData((data) => {
      console.log(`[Term ${id}] Received data:`, JSON.stringify(data));
    });

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`[Term ${id}] Process exited with code`, exitCode);
    });

    setTimeout(() => {
      ptyProcess.write('ls\r');
    }, 3000); // Wait for shell to be ready
  } catch (err) {
    console.error(`[Term ${id}] error:`, err);
  }
};

try {
  execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
} catch (e) {}

createTerminal('1');
setTimeout(() => createTerminal('2'), 2000);
