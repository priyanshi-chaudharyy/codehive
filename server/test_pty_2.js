import pty from 'node-pty';

const createTerminal = (id) => {
  const shell = 'docker';
  const args = [
    'run',
    '-it',
    '--rm',
    '--name', `test-codehive-term-${id}`,
    'node:20-alpine',
    '/bin/sh'
  ];

  try {
    const ptyProcess = pty.spawn(shell, args, {
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
    }, 2000);
  } catch (err) {
    console.error(`[Term ${id}] error:`, err);
  }
};

createTerminal('1');
setTimeout(() => createTerminal('2'), 500);
