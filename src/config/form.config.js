// src/config/form.config.js

export const FORM_CONFIG = {
  hubspot: {
    region: "na1",
    portalId: "20122740",
    formId: "a7a1a71d-fee0-4c1b-85ea-05aede171179",
    submitBaseUrl: "https://api.hsforms.com/submissions/v3/integration/submit",
  },

  chili: {
    tenant: "athena",
    router: "commercial-round-robin",
    formIds: ["athn_form"],
  },

  fallbackValue: "athena20122740",

  animationTime: 300,

  excludedAttributionSteps: [
    "loading",
    "email",
    "info",
    "loading_chili",
    "calendar",
    "success",
    "error",
    "closed",
  ],

  progressSteps: [
    "9",
    "loading",
    "email",
    "info",
    "calendar",
    "success",
  ],

  bannedCountries: [
    "ph",
    "vn",
    "id",
    "in",
    "ng",
    "my",
    "ke",
    "gt",
  ],

  noBackButtonSteps: [
    "loading",
    "email",
  ],

  redirectUrls: {
    bannedCountry: "https://jobs.athena.com",
  },
};