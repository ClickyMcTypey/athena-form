// src/integrations/hubspot.service.js

import { waitFor } from "../utils/wait-for.js";

export function createHubspotService({
  state,
  fieldRenderer,
}) {
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

  return {
    waitForForm,
    fetchData,
    renderCustomFields,
    removeOriginalHubspotForm,
    initCustomFields,
  };
}