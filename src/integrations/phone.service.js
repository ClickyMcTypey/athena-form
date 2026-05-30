// src/integrations/phone.service.js

export function createPhoneService({ state }) {
  function init() {
    const input = document.querySelector("#prettyPhone");

    if (!input) {
      console.warn("Phone input #prettyPhone not found");
      return null;
    }

    if (!window.intlTelInput) {
      console.warn("intlTelInput is not loaded");
      return null;
    }

    // Prevent duplicate initialization
    if (state.phoneInstance) {
      return state.phoneInstance;
    }

    const instance = window.intlTelInput(input, {
      loadUtils: () =>
        import(
          "https://cdn.jsdelivr.net/npm/intl-tel-input@26.0.6/build/js/utils.js"
        ),
      formatAsYouType: true,
      formatOnDisplay: true,
      initialCountry: "US",
      separateDialCode: true,
      strictMode: true,
    });

    state.phoneInstance = instance;

    // temporary backward compatibility
    window.iti = instance;

    return instance;
  }

  function getE164Number() {
    const instance = state.phoneInstance || window.iti;

    if (!instance || !window.intlTelInput?.utils) {
      return "";
    }

    return instance.getNumber(
      window.intlTelInput.utils.numberFormat.E164
    );
  }

  function syncHiddenPhoneField() {
    const instance = state.phoneInstance || window.iti;

    if (!instance || !window.intlTelInput?.utils) {
      $('[name="phone"]').val("");
      return "";
    }

    const isValid = instance.isValidNumber();
    const value = instance.getNumber(
      window.intlTelInput.utils.numberFormat.E164
    );

    if (isValid) {
      $('[name="phone"]').val(value);
      return value;
    }

    $('[name="phone"]').val("");
    return "";
  }

  function isValid() {
    const instance = state.phoneInstance || window.iti;

    if (!instance) return false;

    return instance.isValidNumber();
  }

  return {
    init,
    getE164Number,
    syncHiddenPhoneField,
    isValid,
  };
}