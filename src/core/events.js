// src/core/events.js

export function bindEvents({
    state,
    steps,
    validation,
    animations,
}) {
    function getStepNameFromElement(element) {
        return $(element).closest("[step]").attr("step");
    }

    function getStepElement(stepName) {
        return $(`[step="${stepName}"]`);
    }

    function maybeShowBackButton() {
        const stepIndexes = steps.getSteps();

        if (stepIndexes[1] >= 1) {
            animations.toggleBackButton("show");
        }
    }

    function fireStepAttribution() {
        if (!window.attribution) return;

        const currentStep = steps.getCurrentStep();
        const data = window.attribution.retrieve(currentStep);

        window.attribution.fire(
            currentStep,
            data.answers,
            data.fields
        );
    }

    function syncCheckboxGroup(checkbox) {
        const identifier = $(checkbox).attr("for");
        if (!identifier) return;

        const checkedBoxes = $(`[for="${identifier}"]:checked`);
        const values = [];

        checkedBoxes.each(function () {
            values.push($(this).val());
        });

        $(`[name="${identifier}"]`).val(values.join(";"));
    }

    function syncPhoneValue() {
        if (window.AthenaForm?.phone?.syncHiddenPhoneField) {
            window.AthenaForm.phone.syncHiddenPhoneField();
            return;
        }

        const phoneInstance = state.phoneInstance || window.iti;

        if (!phoneInstance || !window.intlTelInput?.utils) return;

        const value = phoneInstance.getNumber(
            window.intlTelInput.utils.numberFormat.E164
        );

        $('[name="phone"]').val(value);
    }

    function updateValidationForElement(element) {
        const stepName = getStepNameFromElement(element);
        if (!stepName) return false;

        return validation.updateStepValidationUI(stepName);
    }

    // prevent duplicate binding
    $(document).off(".athenaForm");

    $(document).on("change.athenaForm", "input[type='radio']", function () {
        state.nextLocked = true;
        state.backLocked = true;

        const stepName = getStepNameFromElement(this);
        const $step = getStepElement(stepName);

        if ($step.attr("validated")) {
            state.nextLocked = false;
            state.backLocked = false;
            return;
        }

        if (validation.validateStep(stepName)) {
            $step.attr("validated", "1");

            maybeShowBackButton();
            fireStepAttribution();

            const nextStep = steps.getNextStep();
            if (nextStep) {
                steps.switchToStep(nextStep);
            }
        }
    });

    $(document).on("change.athenaForm", "input[type='checkbox']", function () {
        state.nextLocked = true;
        state.backLocked = true;

        $(this).removeAttr("solo");

        syncCheckboxGroup(this);
        updateValidationForElement(this);
    });

    $(document).on("input.athenaForm", "input[type='email']", function () {
        state.nextLocked = true;
        state.backLocked = true;

        updateValidationForElement(this);
    });

    $(document).on(
        "change.athenaForm",
        "input[type='text']:not([honey])",
        function () {
            state.nextLocked = true;
            state.backLocked = true;

            $(this).removeAttr("solo");

            updateValidationForElement(this);
        }
    );

    $(document).on(
        "click.athenaForm",
        "input[type='text']:not([honey]), #prettyPhone",
        function () {
            $(this).removeAttr("solo");
        }
    );

    $(document).on("change.athenaForm", "select", function () {
        state.nextLocked = true;
        state.backLocked = true;

        $(this).removeAttr("solo");
        $('[name="hdyhau_secondary"]').removeAttr("solo");

        updateValidationForElement(this);
    });

    $(document).on("input.athenaForm", "#prettyPhone", function () {
        state.nextLocked = true;
        state.backLocked = true;

        $(this).removeAttr("solo");

        syncPhoneValue();
        updateValidationForElement(this);
    });

    $(document).on("click.athenaForm", "[mask='proceed'][last]", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        $('[step="info"]').find("input, select").removeAttr("solo");

        validation.updateStepValidationUI("info");
    });

    $(document).on("click.athenaForm", "[cmd='proceed']", function (e) {
        const $button = $(this);
        const isLast = $button.is("[last]");

        if (isLast) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if ($button.data("is-submitting")) return;

            $button.data("is-submitting", true);
            $button.prop("disabled", true);

            if (window.AthenaForm?.submission?.submit) {
                window.AthenaForm.submission.submit();
            } else if (window.main?.form?.s) {
                window.main.form.s();
            }

            return;
        }

        if (!state.nextLocked) {
            maybeShowBackButton();
            fireStepAttribution();

            const nextStep = steps.getNextStep();

            if (nextStep) {
                steps.switchToStep(nextStep);
            }

            state.nextLocked = true;
        }
    });

    $(document).on("click.athenaForm", "[cmd='chili_retry']", function () {
        if (state.isChiliSubmitting) return;

        state.isChiliSubmitting = true;

        if (window.AthenaForm?.chili?.submit) {
            window.AthenaForm.chili.submit();
        } else if (window.main?.chili?.submit) {
            window.main.chili.submit();
        }
    });

    $(document).on("click.athenaForm", "[cmd='back']", function () {
        if (state.backLocked) return;

        const stepIndexes = steps.getSteps();

        if (stepIndexes[0] <= 1) {
            animations.toggleBackButton("hide");
        }

        const previousStep = steps.getPreviousStep();

        if (previousStep) {
            steps.switchToStep(previousStep);
        }

        state.backLocked = true;
    });
}