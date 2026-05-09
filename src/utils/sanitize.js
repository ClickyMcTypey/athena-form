// src/utils/sanitize.js

export function sanitizeValue(value) {
  if (typeof value !== "string") return value;

  if (window.DOMPurify?.sanitize) {
    return window.DOMPurify.sanitize(value);
  }

  return value;
}