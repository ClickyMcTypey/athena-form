// src/utils/url.js

export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const output = {};

  params.forEach((value, key) => {
    output[key] = value;
  });

  return output;
}