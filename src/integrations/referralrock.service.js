// src/integrations/referralrock.service.js

export function createReferralRockService() {
  function getReferralCode() {
    if (typeof window.checkRRCode !== "function") {
      return false;
    }

    return window.checkRRCode();
  }

  function fireConversion({
    email,
    firstName,
    lastName,
    referralCode,
  }) {
    const finalReferralCode = referralCode || getReferralCode();

    if (!finalReferralCode) {
      console.log("no Referral Rock Code");
      return false;
    }

    window.referralJS =
      window.referralJS !== null && window.referralJS !== undefined
        ? window.referralJS
        : {};

    window.referralJS.conversion = {
      debug: "true",
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
    getReferralCode,
    fireConversion,
    fireFromCurrentForm,
  };
}