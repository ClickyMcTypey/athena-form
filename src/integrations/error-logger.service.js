// src/integrations/error-logger.service.js

export function createErrorLoggerService({ state }) {
    const CONTAINER_SELECTOR = "#e239";
    const WRAPPER_SELECTOR = "[error-log-wrapper]";
    const FORM_SELECTOR = "[error-log-form]";
    const SOURCE_FORM_SELECTOR = "#athn_form";

    let $storedWrapper = null;

    function cacheErrorForm() {
        const $container = $(CONTAINER_SELECTOR);
        const $wrapper = $container.find(WRAPPER_SELECTOR).first();

        if (!$wrapper.length) {
            //console.warn("Error log wrapper not found");
            return false;
        }

        // Detach keeps jQuery/Webflow-bound data better than remove()
        $storedWrapper = $wrapper.detach();

        return true;
    }

    function restoreErrorForm() {
        const $container = $(CONTAINER_SELECTOR);

        if (!$container.length) {
            //console.warn("Error log container #e239 not found");
            return null;
        }

        if (!$storedWrapper || !$storedWrapper.length) {
            //console.warn("Stored error form not available");
            return null;
        }

        if (!$container.find(WRAPPER_SELECTOR).length) {
            $container.append($storedWrapper);
        }

        return $container.find(FORM_SELECTOR).first();
    }

    function getSimpleBrowserInfo() {
        return {
            browser_user_agent: navigator.userAgent || "",
        };
    }

    function getTimezoneInfo() {
        return {
            timestamp_iso: new Date().toISOString(),
            timestamp_local: new Date().toLocaleString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
            timezone_offset_minutes: new Date().getTimezoneOffset(),
        };
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

            if ($field.attr("id") === "cc-num") return;
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

    function fillField($form, name, value) {
        const $field = $form.find(`[name="${name}"]`);

        if (!$field.length) return;

        const finalValue =
            typeof value === "object" && value !== null
                ? JSON.stringify(value)
                : value ?? "";

        $field.val(finalValue);
    }

    function buildPayload({
        type = "unknown_error",
        message = "",
        stack = "",
        extra = {},
    } = {}) {
        const formData = collectAllFormData();

        return {
            error_type: type,
            error_message: message,
            error_stack: stack,

            current_step:
                window.AthenaForm?.steps?.getCurrentStep?.() ||
                state.currentStep ||
                "",

            email: formData.email || "",
            firstname: formData.firstname || "",
            lastname: formData.lastname || "",

            // Honeypot field
            extra_contact: formData.extra_contact || "",

            lead_score: formData.lead_score || "",
            lead_tier: formData.lead_tier || "",

            page_url: window.location.href,
            page_title: document.title,
            referrer: document.referrer || "",
            user_agent: navigator.userAgent,

            ...getTimezoneInfo(),

            ...getSimpleBrowserInfo(),

            all_form_data_json: JSON.stringify(formData),

            ...extra,
        };
    }

    function submitWebflowForm($form) {
        if (!$form || !$form.length) return false;

        try {
            const $submit = $form.find("[error-log-submit], [type='submit']").first();

            if (!$submit.length) {
                //console.warn("Error log submit button not found");
                return false;
            }

            // Let Webflow's own form handler catch the click
            $submit.trigger("click");

            return true;
        } catch (error) {
            //console.warn("Error log form submit failed", error);
            return false;
        }
    }

    function logError(errorData = {}) {
        try {
            const $form = restoreErrorForm();

            if (!$form || !$form.length) {
                //console.warn("Cannot log error: error form not restored");
                return false;
            }

            const payload = buildPayload(errorData);

            Object.entries(payload).forEach(([key, value]) => {
                fillField($form, key, value);
            });

            submitWebflowForm($form);

            return true;
        } catch (error) {
            //console.warn("Error logger failed", error);
            return false;
        }
    }

    return {
        cacheErrorForm,
        logError,
        buildPayload,
        collectAllFormData,
    };
}