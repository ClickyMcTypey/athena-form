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

  branching: {
    enabled: true,

    rules: {
      "1": {
        field: "hbform_q1_worked_with_an_assistant",
        fallbackBranch: "1",

        map: {
          "yes_but_not_currently": "1",
          "yes_i_have_one_now": "1",
        },

        experimentOverrides: {
          "no_never": {
            globalName: "__MIDABRANCH_090526",
            storageKey: "mida_branch_090526",
            allowedBranches: ["1", "2"],
            fallbackBranch: "1",
          },
        },
      },
    },
  },

  referralRock: {
    enabled: true,

    // Toggle this whenever you want RR debug mode
    debug: true,

    paramName: "REFERRALCODE",
    cookieName: "REFERRALCODE",

    // temporary support for your old cookie name
    legacyCookieName: "_athn",

    cookieMaxAge: 60 * 60 * 24 * 30, // 30 days
  },
};