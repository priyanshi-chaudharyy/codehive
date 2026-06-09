import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Map languages to Docker images and run commands
const DOCKER_CONFIG = {
  javascript: { image: 'node:20-alpine', extension: '.js', getCommand: (filePath) => `node ${filePath}` },
  typescript: { image: 'node:20-alpine', extension: '.ts', getCommand: (filePath) => `npx -y tsx ${filePath}` },
  python: { image: 'python:3-alpine', extension: '.py', getCommand: (filePath) => `python3 ${filePath}` },
  java: { image: 'openjdk:21-slim', extension: '.java', getCommand: (filePath) => `java ${filePath}` },
  cpp: { image: 'gcc:latest', extension: '.cpp', getCommand: (filePath) => `g++ ${filePath} -o out && ./out` },
  c: { image: 'gcc:latest', extension: '.c', getCommand: (filePath) => `gcc ${filePath} -o out && ./out` },
  csharp: { image: 'mono:latest', extension: '.cs', getCommand: (filePath) => `csc ${filePath} && mono main.exe` },
  go: { image: 'golang:alpine', extension: '.go', getCommand: (filePath) => `go run ${filePath}` },
  rust: { image: 'rust:alpine', extension: '.rs', getCommand: (filePath) => `rustc ${filePath} -o out && ./out` },
  ruby: { image: 'ruby:3-alpine', extension: '.rb', getCommand: (filePath) => `ruby ${filePath}` },
  php: { image: 'php:8-cli-alpine', extension: '.php', getCommand: (filePath) => `php ${filePath}` },
  swift: { image: 'swift:latest', extension: '.swift', getCommand: (filePath) => `swift ${filePath}` },
  kotlin: { image: 'zenika/kotlin', extension: '.kt', getCommand: (filePath) => `kotlinc ${filePath} -include-runtime -d main.jar && java -jar main.jar` },
};

/**
 * Execute code securely using isolated Docker containers.
 * 
 * @param {string} code - Source code to execute
 * @param {string} language - Language key
 * @returns {Object} { stdout, stderr, time, memory, status }
 */
export const executeCode = async (code, language) => {
  const config = DOCKER_CONFIG[language];
  
  if (!config) {
    return {
      stdout: `[Execution Engine] Language '${language}' execution not configured locally.\nSupported languages: ${Object.keys(DOCKER_CONFIG).join(', ')}`,
      stderr: '',
      time: '0.00',
      memory: 0,
      status: 'Unsupported Language'
    };
  }

  // Create temporary execution directory
  const runId = Math.random().toString(36).substring(2, 10);
  const tmpDir = path.join(os.tmpdir(), `codehive_exec_${runId}`);
  const fileName = `main${config.extension}`;
  const filePath = path.join(tmpDir, fileName);

  try {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(filePath, code);

    // Normalize path for Windows Docker Desktop if needed
    const normalizedTmpDir = tmpDir.replace(/\\/g, '/');

    // Build the docker run command
    // --rm: remove container after exit
    // --network none: Disable network access for security
    // -m 256m: Limit memory
    // --cpus 0.5: Limit CPU
    const dockerCmd = `docker run --rm --network none -m 256m --cpus 0.5 -v "${normalizedTmpDir}:/app" -w /app ${config.image} ${config.getCommand(fileName)}`;

    const startTime = process.hrtime();
    
    // Execute the command with a 60 second timeout (allows time for Docker to pull images on first run)
    let stdout = '';
    let stderr = '';
    let status = 'Accepted';
    
    try {
      const { stdout: out, stderr: err } = await execPromise(dockerCmd, { timeout: 60000 });
      stdout = out;
      stderr = err;
    } catch (err) {
      if (err.killed) {
        status = 'Time Limit Exceeded';
        stderr = 'Execution timed out (60s limit). If this was the first run for this language, it may be downloading the image. Try again!';
      } else {
        status = 'Runtime Error';
        stdout = err.stdout || '';
        stderr = err.stderr || err.message;
      }
    }

    const diff = process.hrtime(startTime);
    const timeInSeconds = (diff[0] + diff[1] / 1e9).toFixed(2);

    return {
      stdout,
      stderr,
      time: timeInSeconds,
      memory: 0, // Hard to measure peak memory with simple docker run without stats API
      status,
    };
  } catch (error) {
    console.error('Docker execution error:', error);
    return {
      stdout: '',
      stderr: error.message || 'Execution failed',
      time: '0.00',
      memory: 0,
      status: 'Internal Error',
    };
  } finally {
    // Cleanup temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.error(`Failed to cleanup temp dir: ${tmpDir}`, e);
    }
  }
};
