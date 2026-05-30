// src/integrations/error-logger.service.js

export function createErrorLoggerService({ state }) {
  const CONTAINER_SELECTOR = "#e239";
  const SOURCE_FORM_SELECTOR = "#athn_form";

  function getTimezoneInfo() {
    return {
      timestamp_iso: new Date().toISOString(),
      timestamp_local: new Date().toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      timezone_offset_minutes: new Date().getTimezoneOffset(),
    };
  }

  function getEmailDomain(email) {
    if (!email || !String(email).includes("@")) return "";

    return String(email).split("@").pop().trim().toLowerCase();
  }

  function appendValue(output, name, value) {
    if (!name) return;

    if (output[name] === undefined) {
      output[name] = value;
      return;
    }

    if (!Array.isArray(output[name])) {
      output[name] = [output[name]];
    }

    output[name].push(value);
  }

  function collectAllFormData() {
    const output = {};
    const $form = $(SOURCE_FORM_SELECTOR);

    if (!$form.length) return output;

    $form.find("input, select, textarea").each(function () {
      const $field = $(this);
      const name = $field.attr("name");
      const type = String($field.attr("type") || "").toLowerCase();

      if (!name) return;
      if (type === "file") return;

      if (type === "radio") {
        if ($field.is(":checked")) {
          appendValue(output, name, $field.val());
        }

        return;
      }

      if (type === "checkbox") {
        if ($field.is(":checked")) {
          appendValue(output, name, $field.val());
        }

        return;
      }

      appendValue(output, name, $field.val());
    });

    return output;
  }

  function createHiddenInput(name, value) {
    return $("<input>", {
      type: "hidden",
      name,
      value: value ?? "",
    });
  }

  function createErrorForm(payload) {
    const $container = $(CONTAINER_SELECTOR);

    if (!$container.length) {
      console.warn("Error log container #e239 not found");
      return null;
    }

    // Remove old generated error form if present
    $container.find("[data-error-log-wrapper]").remove();

    const $wrapper = $("<div>", {
      class: "w-form",
      "data-error-log-wrapper": "true",
      css: {
        display: "none",
      },
    });

    const $form = $("<form>", {
      id: `error-log-${Date.now()}`,
      name: "athena-error-log",
      "data-name": "Athena Error Log",
      method: "post",
      "data-error-log-form": "true",
    });

    Object.entries(payload).forEach(([key, value]) => {
      const finalValue =
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : value;

      $form.append(createHiddenInput(key, finalValue));
    });

    const $success = $("<div>", {
      class: "w-form-done",
      text: "Logged",
    });

    const $fail = $("<div>", {
      class: "w-form-fail",
      text: "Log failed",
    });

    $wrapper.append($form, $success, $fail);
    $container.append($wrapper);

    return $form[0];
  }

  function refreshWebflowForms() {
    try {
      const forms = window.Webflow?.require?.("forms");

      if (forms?.ready) {
        forms.ready();
      }
    } catch (error) {
      console.warn("Could not refresh Webflow forms module", error);
    }
  }

  function submitErrorForm(form) {
    if (!form) return false;

    try {
      refreshWebflowForms();

      const event = new Event("submit", {
        bubbles: true,
        cancelable: true,
      });

      form.dispatchEvent(event);

      return true;
    } catch (error) {
      console.warn("Error log form submit failed", error);
      return false;
    }
  }

  function buildPayload({
    type = "unknown_error",
    message = "",
    stack = "",
    extra = {},
  } = {}) {
    const formData = collectAllFormData();

    const firstName = formData.firstname || "";
    const lastName = formData.lastname || "";
    const email = formData.email || "";
    const extraContact = formData.extra_contact || "";

    return {
      error_type: type,
      error_message: message,
      error_stack: stack,

      current_step:
        window.AthenaForm?.steps?.getCurrentStep?.() ||
        state.currentStep ||
        "",

      first_name: firstName,
      last_name: lastName,
      email,
      email_domain: getEmailDomain(email),

      // Honeypot value
      extra_contact: extraContact,

      lead_score: formData.lead_score || "",
      lead_tier: formData.lead_tier || "",

      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || "",
      user_agent: navigator.userAgent,

      ...getTimezoneInfo(),

      all_form_data_json: JSON.stringify(formData),

      ...extra,
    };
  }

  function logError(errorData = {}) {
    try {
      const payload = buildPayload(errorData);
      const form = createErrorForm(payload);

      return submitErrorForm(form);
    } catch (error) {
      console.warn("Error logger failed", error);
      return false;
    }
  }

  return {
    logError,
    buildPayload,
    collectAllFormData,
  };
}