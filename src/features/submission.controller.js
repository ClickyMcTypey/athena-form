// src/features/submission.controller.js

export function createSubmissionController({
  state,
  config,
  steps,
  animations,
  hubspot,
  attribution,
  scoring,
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

  async function submit() {
    if (state.isSubmitting) return;

    state.isSubmitting = true;

    state.successNoBook = false;
    state.chiliData = null;

    try {
      if (hasHoneypotValue()) {
        steps.switchToStep("error");
        return;
      }

      removeHoneypotMarkup();

      if (!attribution.vowelCheck()) {
        steps.switchToStep("error");
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

      if (scoring?.calculateAndWrite) {
        scoring.calculateAndWrite();
      }

      const payload = hubspot.buildSubmissionPayload();
      await hubspot.submitForm(payload);

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

      steps.switchToStep("error");
    }
  }

  return {
    submit,
  };
}