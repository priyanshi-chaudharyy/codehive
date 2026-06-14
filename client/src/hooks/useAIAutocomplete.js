import { useEffect, useRef } from 'react';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;
const STORAGE_KEY = 'codehive_gemini_key';

/**
 * Hook that registers a Monaco InlineCompletionsProvider powered by Gemini.
 * Shows ghost text suggestions as the user types. Accept with Tab.
 *
 * @param {React.RefObject} monacoRef - Reference to the Monaco instance
 * @param {boolean} isEnabled - Whether autocomplete is enabled
 */
const useAIAutocomplete = (monacoRef, isEnabled = true) => {
  const providerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const monaco = monacoRef?.current;
    if (!monaco || !isEnabled) return;

    // Wait a bit for Monaco to fully initialize
    const timer = setTimeout(() => {
      if (providerRef.current) return; // Already registered

      const provider = monaco.languages.registerInlineCompletionsProvider(
        // Register for all languages
        { pattern: '**' },
        {
          provideInlineCompletions: async (model, position, context, token) => {
            const apiKey = localStorage.getItem(STORAGE_KEY);
            if (!apiKey) return { items: [] };

            // Cancel any pending request
            if (abortRef.current) {
              abortRef.current.abort();
            }

            // Debounce: wait 800ms of no typing
            await new Promise((resolve, reject) => {
              const t = setTimeout(resolve, 800);
              token.onCancellationRequested(() => {
                clearTimeout(t);
                reject(new Error('cancelled'));
              });
            }).catch(() => { throw new Error('cancelled'); });

            if (token.isCancellationRequested) return { items: [] };

            // Get code context: 200 lines before cursor, 50 lines after
            const fullText = model.getValue();
            const offset = model.getOffsetAt(position);
            const textBefore = fullText.slice(Math.max(0, offset - 4000), offset);
            const textAfter = fullText.slice(offset, offset + 1000);

            // Don't suggest for very short inputs or empty lines
            const currentLine = model.getLineContent(position.lineNumber).trim();
            if (currentLine.length < 3) return { items: [] };

            const language = model.getLanguageId();

            const prompt = `You are a code autocomplete engine. Complete the code at the cursor position marked with <CURSOR>.
ONLY output the completion text that goes right after the cursor. Do NOT repeat any text that already exists.
Do NOT include explanations, markdown, or code fences. Output ONLY the raw code completion (1-5 lines max).
If no meaningful completion exists, output nothing.

\`\`\`${language}
${textBefore}<CURSOR>${textAfter}
\`\`\``;

            try {
              const controller = new AbortController();
              abortRef.current = controller;

              const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 256,
                    stopSequences: ['\n\n\n'],
                  },
                }),
              });

              if (!response.ok || token.isCancellationRequested) return { items: [] };

              const data = await response.json();
              const completion = data?.candidates?.[0]?.content?.parts?.[0]?.text;

              if (!completion || completion.trim().length === 0) return { items: [] };

              // Clean up: remove any markdown fences the model might sneak in
              let cleanText = completion;
              if (cleanText.startsWith('```')) {
                const firstNewline = cleanText.indexOf('\n');
                cleanText = cleanText.slice(firstNewline + 1);
              }
              if (cleanText.endsWith('```')) {
                cleanText = cleanText.slice(0, -3);
              }
              cleanText = cleanText.trimEnd();

              if (!cleanText) return { items: [] };

              return {
                items: [
                  {
                    insertText: cleanText,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  },
                ],
              };
            } catch (err) {
              if (err.name === 'AbortError' || err.message === 'cancelled') {
                return { items: [] };
              }
              console.warn('[AI Autocomplete] Error:', err.message);
              return { items: [] };
            }
          },

          freeInlineCompletions: () => {
            // No cleanup needed
          },
        }
      );

      providerRef.current = provider;
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [monacoRef, isEnabled]);
};

export default useAIAutocomplete;
