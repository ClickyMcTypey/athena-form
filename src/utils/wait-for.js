// src/utils/wait-for.js

export function waitFor(checkFn, options = {}) {
  const interval = options.interval || 100;
  const maxAttempts = options.maxAttempts || 50;

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const timer = setInterval(() => {
      attempts++;

      const result = checkFn();

      if (result) {
        clearInterval(timer);
        resolve(result);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(timer);
        reject(new Error("waitFor timed out"));
      }
    }, interval);
  });
}