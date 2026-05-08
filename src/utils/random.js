// src/utils/random.js

export function getRandomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}