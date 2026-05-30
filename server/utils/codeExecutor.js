import axios from 'axios';

/**
 * Language ID mapping for Judge0 CE API.
 * See: https://ce.judge0.com/languages
 */
const LANGUAGE_IDS = {
  javascript: 63,  // Node.js
  typescript: 74,
  python: 71,      // Python 3
  java: 62,
  cpp: 54,         // C++ (GCC)
  c: 50,           // C (GCC)
  csharp: 51,      // C# (Mono)
  go: 60,
  rust: 73,
  ruby: 72,
  php: 68,
  swift: 83,
  kotlin: 78,
};

/**
 * Mock code executor for development without Judge0 API key.
 * Simulates code execution with a simple eval for JavaScript
 * and returns a mock response for other languages.
 */
const mockExecute = async (code, language) => {
  // Simulate execution delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (language === 'javascript') {
    try {
      // Capture console.log output
      let output = '';
      const mockConsole = {
        log: (...args) => {
          output += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
        },
      };

      // Very basic eval — NOT secure, only for dev/demo
      const fn = new Function('console', code);
      fn(mockConsole);

      return {
        stdout: output || '(no output)\n',
        stderr: '',
        time: '0.01',
        memory: 1024,
        status: 'Accepted',
      };
    } catch (err) {
      return {
        stdout: '',
        stderr: err.message,
        time: '0.00',
        memory: 0,
        status: 'Runtime Error',
      };
    }
  }

  // For non-JS languages, return a helpful message
  return {
    stdout: `[Mock Executor] Code received (${code.length} chars)\nLanguage: ${language}\n\nTo enable real execution, add your Judge0 API key to .env\n`,
    stderr: '',
    time: '0.00',
    memory: 0,
    status: 'Accepted',
  };
};

/**
 * Execute code using Judge0 CE API.
 * Falls back to mock executor if no API key is configured.
 *
 * @param {string} code - Source code to execute
 * @param {string} language - Language key (e.g., 'javascript', 'python')
 * @returns {Object} { stdout, stderr, time, memory, status }
 */
export const executeCode = async (code, language) => {
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiUrl = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';

  // Use mock executor if no API key
  if (!apiKey) {
    console.log('⚠️  No Judge0 API key — using mock executor');
    return mockExecute(code, language);
  }

  const languageId = LANGUAGE_IDS[language];

  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  try {
    // Submit code for execution
    const submitResponse = await axios.post(
      `${apiUrl}/submissions`,
      {
        source_code: Buffer.from(code).toString('base64'),
        language_id: languageId,
        stdin: '',
      },
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        params: {
          base64_encoded: true,
          wait: true,
          fields: 'stdout,stderr,time,memory,status',
        },
      }
    );

    const result = submitResponse.data;

    return {
      stdout: result.stdout
        ? Buffer.from(result.stdout, 'base64').toString()
        : '',
      stderr: result.stderr
        ? Buffer.from(result.stderr, 'base64').toString()
        : '',
      time: result.time || '0.00',
      memory: result.memory || 0,
      status: result.status?.description || 'Unknown',
    };
  } catch (error) {
    console.error('Judge0 API error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || 'Code execution failed'
    );
  }
};

export { LANGUAGE_IDS };
