// src/features/submission.controller.js

export function createSubmissionController({
  state,
  config,
  steps,
  animations,
  hubspot,
  attribution,
  scoring,
  errorLogger,
}) {
  function hasHoneypotValue() {
    const value = $("[honey]").val();
    return String(value || "").trim() !== "";
  }

  function removeHoneypotMarkup() {
    $(".honeycontainer").remove();
  }

  function getSelectedCountryCode() {
    const phoneInstance = state.phoneInstance || window.iti;

    if (!phoneInstance?.getSelectedCountryData) {
      return "";
    }

    return phoneInstance.getSelectedCountryData().iso2;
  }

  function showErrorStep(errorData = {}) {
    errorLogger?.logError?.(errorData);

    attribution?.fire?.("error");

    steps.switchToStep("error");
  }

  function isBannedCountry() {
    const countryCode = getSelectedCountryCode();

    return config.bannedCountries.includes(countryCode);
  }

  function unlockSubmitButton() {
    const $submitBtn = $("[cmd='proceed'][last]");

    $submitBtn.data("is-submitting", false);
    $submitBtn.prop("disabled", false);
    $submitBtn.removeClass("disabled");
  }

  function showTier3Message() {
    $('[c_element="error_title"]').text("We'll be in touch!");
    $('[c_element="error_body"]').text("Someone from our team will call you shortly.");
  }

  function isTier3(scoringResult) {
    return scoringResult?.tier === "tier_3";
  }

  async function submit() {
    if (state.isSubmitting) return;

    state.isSubmitting = true;

    state.successNoBook = false;
    state.chiliData = null;

    try {
      if (hasHoneypotValue()) {
        showErrorStep({
          type: "honeypot_triggered",
          message: "Honeypot field extra_contact had a value",
          extra: {
            extra_contact: $("[name='extra_contact']").val() || "",
          },
        });

        return;
      }

      removeHoneypotMarkup();

      if (!attribution.vowelCheck()) {
        showErrorStep({
          type: "name_quality_failed",
          message: "Name quality / vowel check failed",
        });

        return;
      }

      if (isBannedCountry()) {
        window.location.href = config.redirectUrls.bannedCountry;
        return;
      }

      const currentStep = steps.getCurrentStep();

      animations.toggleContinueButton("hide", currentStep);
      animations.toggleBackButton("hide");

      steps.switchToStep("loading_chili");

      let scoringResult = null;

      if (scoring?.calculateAndWrite) {
        scoringResult = scoring.calculateAndWrite();
      }

      const payload = hubspot.buildSubmissionPayload();
      await hubspot.submitForm(payload);

      // If tier 3, HubSpot already received the submission.
      // Now stop the ChiliPiper flow and show the custom message.
      if (isTier3(scoringResult)) {
        showTier3Message();

        state.isSubmitting = false;

        animations.toggleBackButton("hide");
        steps.switchToStep("error");

        return;
      }

      attribution.fire("calendar");

      steps.switchToStep("calendar");

      if (window.AthenaForm?.chili?.submit) {
        window.AthenaForm.chili.submit();
      } else if (window.main?.chili?.submit) {
        window.main.chili.submit();
      } else {
        console.warn("ChiliPiper submit handler not found");
      }

    } catch (error) {
      console.error("Submission error:", error);

      state.isSubmitting = false;
      unlockSubmitButton();

      showErrorStep({
        type: "submission_exception",
        message: error?.message || "Unknown submission error",
        stack: error?.stack || "",
      });
    }
  }

  return {
    submit,
  };
}