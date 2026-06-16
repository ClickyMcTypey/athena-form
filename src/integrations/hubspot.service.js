// src/integrations/hubspot.service.js

import { waitFor } from "../utils/wait-for.js";
import { getCookie } from "../utils/cookies.js";
import { sanitizeValue } from "../utils/sanitize.js";

export function createHubspotService({
  state,
  config,
  fieldRenderer,
}) {

  function createEmbeddedForm() {
    if (!window.hbspt?.forms?.create) {
      throw new Error("HubSpot forms script is not loaded");
    }

    const { region, portalId, formId } = config.hubspot;

    window.hbspt.forms.create({
      region,
      portalId,
      formId,
    });
  }

  async function waitForForm() {
    const form = await waitFor(
      () => $(".hbspt-form form")[0],
      {
        interval: 100,
        maxAttempts: 80,
      }
    );

    state.hubspotFormElement = form;
    return form;
  }

  function fetchData() {
    if (!state.hubspotFormElement) {
      state.hubspotFormElement = $(".hbspt-form form")[0];
    }

    if (!state.hubspotFormElement) {
      console.warn("HubSpot form element not found");
      return;
    }

    state.hubspotFieldsArray = $(state.hubspotFormElement).find(
      ".field.hs-form-field"
    );

    state.hubspotExtractedData = {};
  }

  function renderCustomFields() {
    const $steps = $("[step]").not("[ignore]");

    $steps.each(function () {
      const hsFields = $(this).attr("hsfield");

      if (!hsFields) return;

      const fieldList = hsFields.split(";").filter(Boolean);

      fieldList.forEach((fieldName) => {
        fieldRenderer.renderField(fieldName);
      });
    });
  }

  function removeOriginalHubspotForm() {
    if (window.HubSpotForms?.removeAll) {
      window.HubSpotForms.removeAll();
    }
  }

  async function initCustomFields() {
    await waitForForm();
    fetchData();
    renderCustomFields();
    removeOriginalHubspotForm();
  }

  async function captureIp() {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();

      state.userIp = data.ip;
      window.a = data.ip; // temporary old-code compatibility

      return data.ip;
    } catch (error) {
      console.error("Could not capture IP", error);
      return null;
    }
  }

  function formFieldsToHSJSON(form) {
    const fieldArray = [];
    const formData = new FormData(form);

    for (const [name, rawValue] of formData.entries()) {
      fieldArray.push({
        name,
        value: sanitizeValue(rawValue),
      });
    }

    return fieldArray;
  }

  function buildContext() {
    const hutk = getCookie("hubspotutk");
    state.hubspotUtk = hutk;
    window.ut = hutk; // temporary old-code compatibility

    const context = {
      pageUri: window.location.href,
      pageName: document.title,
    };

    if (hutk && String(hutk).trim()) {
      context.hutk = String(hutk).trim();
    }

    if (state.userIp) {
      context.ipAddress = state.userIp;
    }

    return context;
  }

  function buildSubmissionPayload(form = document.querySelector("#athn_form")) {
    if (!form) {
      const error = new Error("Form #athn_form not found");
      error.type = "missing_athn_form";
      throw error;
    }

    return {
      submittedAt: Date.now(),
      fields: formFieldsToHSJSON(form),
      context: buildContext(),
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: "I agree to receive email and text messages from Athena. Message and data rates may apply.",
          communications: [],
        },
      },
    };
  }

  function getSubmitUrl() {
    const { submitBaseUrl, portalId, formId } = config.hubspot;

    return `${submitBaseUrl}/${portalId}/${formId}`;
  }

  async function submitForm(payload) {
    let response;

    try {
      response = await fetch(getSubmitUrl(), {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      const error = new Error("Network error while submitting to HubSpot");
      error.type = "hubspot_network_error";
      error.originalError = networkError;
      throw error;
    }

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const error = new Error("HubSpot API rejected the submission");

      if (response.status === 429) {
        error.type = "hubspot_rate_limited";
      } else if (response.status >= 500) {
        error.type = "hubspot_server_error";
      } else {
        error.type = "hubspot_api_error";
      }

      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;

      throw error;
    }

    return data;
  }

  return {
    createEmbeddedForm,
    waitForForm,
    fetchData,
    renderCustomFields,
    removeOriginalHubspotForm,
    initCustomFields,
    captureIp,
    buildSubmissionPayload,
    submitForm,
  };
}