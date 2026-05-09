// src/integrations/referralrock.service.js

export function createReferralRockService({ config }) {
  const rrConfig = config.referralRock || {};

  function isEnabled() {
    return rrConfig.enabled !== false;
  }

  function getCookie(name) {
    if (!name) return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
      return decodeURIComponent(parts.pop().split(";").shift());
    }

    return null;
  }

  function setCookie(name, value) {
    if (!name || !value) return;

    const maxAge = rrConfig.cookieMaxAge || 60 * 60 * 24 * 30;

    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function getReferralCodeFromUrl() {
    const paramName = rrConfig.paramName || "REFERRALCODE";
    const params = new URLSearchParams(window.location.search);

    return params.get(paramName);
  }

  function captureReferralCode() {
    if (!isEnabled()) return null;

    const urlReferralCode = getReferralCodeFromUrl();

    if (urlReferralCode) {
      setCookie(rrConfig.cookieName || "REFERRALCODE", urlReferralCode);

      // Optional migration support for the old cookie
      if (rrConfig.legacyCookieName) {
        setCookie(rrConfig.legacyCookieName, urlReferralCode);
      }

      return urlReferralCode;
    }

    return (
      getCookie(rrConfig.cookieName || "REFERRALCODE") ||
      getCookie(rrConfig.legacyCookieName) ||
      null
    );
  }

  function getReferralCode() {
    return captureReferralCode();
  }

  function hasReferralCode() {
    return Boolean(getReferralCode());
  }

  function fireConversion({
    email,
    firstName,
    lastName,
    referralCode,
  } = {}) {
    if (!isEnabled()) {
      console.log("ReferralRock skipped: disabled in config");
      return false;
    }

    const finalReferralCode = referralCode || getReferralCode();

    if (!finalReferralCode) {
      console.log("ReferralRock skipped: no referral code found");
      return false;
    }

    window.referralJS =
      window.referralJS !== null && window.referralJS !== undefined
        ? window.referralJS
        : {};

    window.referralJS.conversion = {
      debug: String(Boolean(rrConfig.debug)),
      parameters: {
        email,
        firstName,
        lastName,
        referralCode: finalReferralCode,
      },
    };

    return true;
  }

  function fireFromCurrentForm() {
    return fireConversion({
      email: $('[name="email"]').val(),
      firstName: $('[name="firstname"]').val(),
      lastName: $('[name="lastname"]').val(),
      referralCode: getReferralCode(),
    });
  }

  return {
    captureReferralCode,
    getReferralCode,
    hasReferralCode,
    fireConversion,
    fireFromCurrentForm,
  };
}