export function createFormSchemaService({ state, config }) {
    const schemaConfig = config.formSchema || {};

    function isEnabled() {
        return schemaConfig.enabled !== false;
    }

    function parseList(value) {
        if (!value) return [];

        return String(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function cleanText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function getForm() {
        const selector = schemaConfig.formSelector || "#athn_form";
        return $(selector).first();
    }

    function getCurrentBranch() {
        return state.currentBranch || null;
    }

    function getVisibilityFlags() {
        const flags = state.visibilityFlags || window.__ATHENA_FLAGS__ || [];

        if (!Array.isArray(flags)) return [];

        return flags.map(String).filter(Boolean);
    }

    function getStepLabel($step) {
        const stepName = String($step.attr("step") || "");

        const $heading = $step
            .find(".signup-b-quiz-heading, .text-serif-founders-heading")
            .first();

        const headingText = cleanText($heading.text());

        if (headingText) return headingText;

        return stepName;
    }

    function isElementActive($el) {
        if ($el.is("[hidden]")) return false;
        if ($el.css("display") === "none") return false;
        if ($el.css("visibility") === "hidden") return false;

        return true;
    }

    function collectAddedElements() {
        const selector = schemaConfig.addedElementSelector || "[context]";
        const addedElements = [];

        $(selector).each(function () {
            const $el = $(this);

            // Avoid duplicating elements already inside steps
            if ($el.closest("[step]").length) return;

            if (!isElementActive($el)) return;

            const context = cleanText($el.attr("context"));
            const visibilityFlagsRequired = parseList($el.attr("data-athena-show"));

            if (!context) return;

            addedElements.push({
                context,
                visibility_flags_required: visibilityFlagsRequired
            });
        });

        return addedElements;
    }

    function getFieldLabel($step, internalName, $field) {
        const schemaLabel = $field.attr("data-schema-label");

        if (schemaLabel) return cleanText(schemaLabel);

        const id = $field.attr("id");

        if (id) {
            const $labelById = $step.find(`label[for="${id}"]`).first();

            if ($labelById.length) {
                return cleanText($labelById.text());
            }
        }

        const $fieldWrapper = $field.closest(
            "[hsfield], [data-field], .hs-form-field, .form-field, .signup-field, .field"
        );

        const $wrapperLabel = $fieldWrapper
            .find(
                [
                    "[data-schema-field-label]",
                    "[field-label]",
                    "[data-field-label]",
                    "legend",
                    "label"
                ].join(",")
            )
            .first();

        if ($wrapperLabel.length) {
            return cleanText($wrapperLabel.text());
        }

        const $stepLabel = $step
            .find(`[data-schema-field="${internalName}"]`)
            .first();

        if ($stepLabel.length) {
            return cleanText($stepLabel.text());
        }

        return "";
    }

    function isFieldRequired($fields) {
        if (!$fields || !$fields.length) return false;

        const hasRequired = $fields.filter("[required]").length > 0;

        if (hasRequired) return true;

        const hasMin = $fields.filter("[min]").length > 0;

        if (hasMin) return true;

        const wrapperRequired =
            $fields
                .first()
                .closest("[required], [data-required='true'], .required")
                .length > 0;

        return wrapperRequired;
    }

    function getOptionLabel($step, $input) {
        const id = $input.attr("id");

        if (id) {
            const $label = $step.find(`label[for="${id}"]`).first();

            if ($label.length) {
                return cleanText($label.text());
            }
        }

        return cleanText($input.closest("label").text());
    }

    function collectRadioField($step, name) {
        const $radios = $step.find(`input[type="radio"][name="${name}"]`);

        if (!$radios.length) return null;

        const options = [];

        $radios.each(function () {
            const $radio = $(this);

            options.push({
                label: getOptionLabel($step, $radio),
                value: String($radio.val() || "")
            });
        });

        return {
            internal_name: name,
            type: "radio",
            label: getFieldLabel($step, name, $radios.first()),
            required: isFieldRequired($radios),
            options
        };
    }

    function collectCheckboxField($step, name) {
        const $checkboxes = $step.find(`input[type="checkbox"][for="${name}"]`);

        if (!$checkboxes.length) return null;

        const options = [];

        $checkboxes.each(function () {
            const $checkbox = $(this);

            options.push({
                label: getOptionLabel($step, $checkbox),
                value: String($checkbox.val() || "")
            });
        });

        const $hiddenAggregator = $step.find(`input[type="hidden"][name="${name}"]`);

        return {
            internal_name: name,
            type: "checkbox",
            label: getFieldLabel($step, name, $hiddenAggregator.length ? $hiddenAggregator : $checkboxes.first()),
            required: isFieldRequired($hiddenAggregator.length ? $hiddenAggregator : $checkboxes),
            options
        };
    }

    function collectSelectField($step, name) {
        const $select = $step.find(`select[name="${name}"]`).first();

        if (!$select.length) return null;

        const options = [];

        $select.find("option").each(function () {
            const $option = $(this);
            const value = String($option.attr("value") || $option.text() || "").trim();
            const label = cleanText($option.text());

            if (!value && $option.is("[disabled]")) return;

            options.push({
                label,
                value
            });
        });

        return {
            internal_name: name,
            type: "select",
            label: getFieldLabel($step, name, $select),
            required: isFieldRequired($select),
            options
        };
    }

    function getInputType($field) {
        const tagName = String($field.prop("tagName") || "").toLowerCase();

        if (tagName === "textarea") return "textarea";
        if (tagName === "select") return "select";

        return String($field.attr("type") || "text").toLowerCase();
    }

    function collectBasicField($step, name) {
        const $field = $step
            .find(`[name="${name}"]`)
            .filter("input, textarea")
            .not('[type="radio"]')
            .not('[type="checkbox"]')
            .not('[type="hidden"]')
            .not('[type="submit"]')
            .not('[type="button"]')
            .first();

        if (!$field.length) return null;

        return {
            internal_name: name,
            type: getInputType($field),
            label: getFieldLabel($step, name, $field),
            required: isFieldRequired($field),
            options: []
        };
    }

    function collectStepFields($step) {
        const fieldsByName = new Map();

        // Radios
        $step.find('input[type="radio"][name]').each(function () {
            const name = $(this).attr("name");

            if (!name || fieldsByName.has(name)) return;

            const field = collectRadioField($step, name);

            if (field) fieldsByName.set(name, field);
        });

        // Custom checkboxes using for="field_name"
        $step.find('input[type="checkbox"][for]').each(function () {
            const name = $(this).attr("for");

            if (!name || fieldsByName.has(name)) return;

            const field = collectCheckboxField($step, name);

            if (field) fieldsByName.set(name, field);
        });

        // Selects
        $step.find("select[name]").each(function () {
            const name = $(this).attr("name");

            if (!name || fieldsByName.has(name)) return;

            const field = collectSelectField($step, name);

            if (field) fieldsByName.set(name, field);
        });

        // Text/email/phone/textarea fields
        $step
            .find("input[name], textarea[name]")
            .not('[type="radio"]')
            .not('[type="checkbox"]')
            .not('[type="hidden"]')
            .not('[type="submit"]')
            .not('[type="button"]')
            .each(function () {
                const name = $(this).attr("name");

                if (!name || fieldsByName.has(name)) return;

                const field = collectBasicField($step, name);

                if (field) fieldsByName.set(name, field);
            });

        return Array.from(fieldsByName.values());
    }

    function shouldIncludeStep($step) {
        const stepName = String($step.attr("step") || "");

        if (!stepName) return false;

        const excludedSteps = schemaConfig.excludedSteps || [];

        if (excludedSteps.includes(stepName)) return false;

        const isPrefilled = $step.is("[prefilled]");
        const isSkipped = $step.is("[skip]");

        return !isSkipped || isPrefilled;
    }

    function collectSteps() {
        const $form = getForm();
        const stepSelector = schemaConfig.stepSelector || "[step]";
        const $steps = $form.length ? $form.find(stepSelector) : $(stepSelector);
        const steps = [];

        $steps.each(function () {
            const $step = $(this);

            if (!shouldIncludeStep($step)) return;

            const stepName = String($step.attr("step") || "");
            const isPrefilled = $step.is("[prefilled]");
            const branchRequirement = $step.attr("branches") || "global";
            const visibilityFlagsRequired = parseList($step.attr("data-athena-step-flag"));

            steps.push({
                step: stepName,
                step_label: getStepLabel($step),
                is_prefilled: isPrefilled,
                is_visible_to_user: !isPrefilled && !$step.is("[skip]"),
                branch_requirement: branchRequirement,
                visibility_flags_required: visibilityFlagsRequired,
                fields: collectStepFields($step)
            });
        });

        return steps;
    }

    function categorizeHiddenField(name) {
        const lowerName = String(name || "").toLowerCase();

        if (
            lowerName.startsWith("utm_") ||
            ["gclid", "fbclid", "msclkid"].includes(lowerName)
        ) {
            return "attribution";
        }

        if (
            lowerName.includes("referral") ||
            lowerName === "referralcode" ||
            lowerName === "referral_code"
        ) {
            return "referral";
        }

        if (
            lowerName.includes("score") ||
            lowerName.includes("tier") ||
            lowerName.startsWith("leadscoring_")
        ) {
            return "scoring";
        }

        if (
            lowerName.includes("conversion") ||
            lowerName.includes("ga4") ||
            lowerName.includes("gtm")
        ) {
            return "analytics";
        }

        if (
            lowerName.includes("hs_") ||
            lowerName.includes("hubspot") ||
            lowerName === "hutk"
        ) {
            return "hubspot";
        }

        return "other";
    }

    function isCheckboxAggregator(name) {
        if (!name) return false;

        return $(`input[type="checkbox"][for="${name}"]`).length > 0;
    }

    function shouldExcludeHiddenField(name) {
        if (!name) return true;

        const excludedHiddenFields = schemaConfig.excludedHiddenFields || [];

        if (excludedHiddenFields.includes(name)) return true;

        if (isCheckboxAggregator(name)) return true;

        return false;
    }

    function collectHiddenFields() {
        const $form = getForm();
        const hiddenFields = [];
        const excludedFields = [];

        if (!$form.length) {
            return {
                hiddenFields,
                excludedFields
            };
        }

        $form.find('input[type="hidden"], textarea[hidden]').each(function () {
            const $field = $(this);
            const name = $field.attr("name") || $field.attr("id") || "";

            if (shouldExcludeHiddenField(name)) {
                excludedFields.push({
                    internal_name: name,
                    reason: "excluded_hidden_field"
                });

                return;
            }

            hiddenFields.push({
                internal_name: name,
                type: "hidden",
                category: categorizeHiddenField(name)
            });
        });

        return {
            hiddenFields,
            excludedFields
        };
    }

    function buildSnapshot() {
        const hiddenResult = collectHiddenFields();

        return {
            form_version: schemaConfig.formVersion || "1",
            form_effectivity_date: schemaConfig.formEffectivityDate || "",
            form_version_context: schemaConfig.formVersionContext || "",

            runtime_context: {
                current_branch: getCurrentBranch(),
                visibility_flags: getVisibilityFlags()
            },

            steps: collectSteps(),

            added_elements: collectAddedElements(),

            hidden_fields: hiddenResult.hiddenFields,

            excluded_fields: hiddenResult.excludedFields
        };
    }

    function writeSnapshot() {
        if (!isEnabled()) return null;

        const $form = getForm();

        if (!$form.length) {
            console.warn("Form schema snapshot skipped: form not found");
            return null;
        }

        const outputField = schemaConfig.outputField || "form_snapshot_json";
        const snapshot = buildSnapshot();
        const json = JSON.stringify(snapshot);

        let $output = $form.find(`[name="${outputField}"]`).first();

        if (!$output.length) {
            $output = $(`<textarea name="${outputField}" style="display:none;"></textarea>`);
            $form.append($output);
        }

        $output.val(json);

        return snapshot;
    }

    return {
        buildSnapshot,
        writeSnapshot
    };
}