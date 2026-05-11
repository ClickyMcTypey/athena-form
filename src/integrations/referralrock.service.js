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
    if (!name || value === null || value === undefined || value === "") return;

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

  function getStoredReferralCode() {
    const cookieName = rrConfig.cookieName || "REFERRALCODE";
    const legacyCookieName = rrConfig.legacyCookieName || "_athn";

    return getCookie(cookieName) || getCookie(legacyCookieName) || null;
  }

  function captureReferralCode() {
    if (!isEnabled()) return null;

    const urlReferralCode = getReferralCodeFromUrl();

    if (urlReferralCode) {
      setCookie(rrConfig.cookieName || "REFERRALCODE", urlReferralCode);

      if (rrConfig.legacyCookieName) {
        setCookie(rrConfig.legacyCookieName, urlReferralCode);
      }

      return urlReferralCode;
    }

    return getStoredReferralCode();
  }

  function getReferralCode() {
    return getStoredReferralCode();
  }

  function hasReferralCode() {
    return Boolean(getReferralCode());
  }

  function isReferralRockEligible() {
    const eligibleCookieName =
      rrConfig.eligibleCookieName || "_athn_rr_eligible";

    if (window.AthenaAttributionCapture?.isReferralRockEligible) {
      return window.AthenaAttributionCapture.isReferralRockEligible();
    }

    return getCookie(eligibleCookieName) === "1";
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

    if (!isReferralRockEligible()) {
      console.log("ReferralRock skipped: referral is not eligible");
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

    console.log("ReferralRock fired", {
      debug: Boolean(rrConfig.debug),
      referralCode: finalReferralCode,
    });

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

  function checkRRCodeLegacy() {
    return getReferralCode() || false;
  }

  return {
    captureReferralCode,
    getReferralCode,
    hasReferralCode,
    isReferralRockEligible,
    fireConversion,
    fireFromCurrentForm,

    // legacy compatibility
    checkRRCodeLegacy,
  };
}