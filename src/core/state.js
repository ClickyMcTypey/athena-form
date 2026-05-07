// src/core/state.js

export const state = {
  currentStep: null,

  hubspotFormElement: null,
  hubspotFieldsArray: [],
  hubspotExtractedData: {},

  phoneInstance: null,

  utmParams: {},
  hubspotUtk: null,
  userIp: null,

  isSubmitting: false,
  isChiliSubmitting: false,
  successNoBook: false,

  chiliData: null,

  nextLocked: false,
  backLocked: false,
};