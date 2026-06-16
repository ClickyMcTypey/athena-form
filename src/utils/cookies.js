// src/utils/cookies.js

export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(";").shift() || "");
  }
  return null;
}

export function parseEncodedCookiePairs(cookieValue) {
  if (!cookieValue) return {};

  const output = {};

  const decodedCookie = decodeURIComponent(cookieValue);

  decodedCookie.split(";").forEach((pair) => {
    const [key, value] = pair.split("=");

    if (key && value) {
      output[key.trim()] = encodeURIComponent(value.trim());
    }
  });

  return output;
}