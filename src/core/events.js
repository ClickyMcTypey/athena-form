// src/core/events.js

export function bindEvents({
    state,
    steps,
    validation,
    animations,
    branching,
    attribution,
}) {
    function getStepNameFromElement(element) {
        return $(element).closest("[step]").attr("step");
    }

    function getStepElement(stepName) {
        return $(`[step="${stepName}"]`);
    }

    function scrollToFormTop() {
        if (window.lenis?.scrollTo) {
            window.lenis.scrollTo(0, {
                duration: 0.8,
            });
            return;
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    function maybeShowBackButton() {
        const stepIndexes = steps.getSteps();

        if (stepIndexes[1] >= 1) {
            animations.toggleBackButton("show");
        }
    }

    function fireStepAttribution() {
        const currentStep = steps.getCurrentStep();

        const attributionService =
            attribution || window.AthenaForm?.attribution || window.attribution;

        if (!attributionService?.retrieve || !attributionService?.fire) {
            console.warn("Attribution service not available");
            return;
        }

        const data = attributionService.retrieve(currentStep);

        //log hide
        // console.log("Firing attribution", {
        //     step: currentStep,
        //     answers: data.answers,
        //     fields: data.fields,
        // });

        attributionService.fire(
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

            branching?.applyFromStep(stepName);

            const nextStep = steps.getNextStep();
            if (nextStep) {
                steps.switchToStep(nextStep);
                scrollToFormTop();
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

    function submitFromCallStep(button, postSubmitAction) {
        const $button = $(button);

        if ($button.data("is-submitting")) return;

        $button.data("is-submitting", true);
        $button.prop("disabled", true);

        if (window.AthenaForm?.submission?.submit) {
            window.AthenaForm.submission.submit({
                postSubmitAction
            });
        }
    }

    $(document).on("click.athenaForm", "[cmd='submit_redirect']", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        submitFromCallStep(this, "redirect");
    });

    $(document).on("click.athenaForm", "[cmd='submit_chili']", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        submitFromCallStep(this, "chili");
    });

    $(document).on("click.athenaForm", "[cmd='proceed']", function (e) {
        const $button = $(this);
        const isLast = $button.is("[last]");

        if (isLast) {
            e.preventDefault();
            e.stopImmediatePropagation();

            const currentStep = steps.getCurrentStep();

            if (
                currentStep === "info" &&
                visibility?.hasFlag?.("show-call-step")
            ) {
                const nextStep = steps.getNextStep();

                if (nextStep === "call") {
                    steps.switchToStep("call");
                    scrollToFormTop();
                }

                return;
            }

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

            branching?.applyFromStep(steps.getCurrentStep());

            const nextStep = steps.getNextStep();

            if (nextStep) {
                steps.switchToStep(nextStep);
                scrollToFormTop();
            }

            state.nextLocked = true;
        }
    });

    $(document).on("click.athenaForm", "[cmd='chili_retry']", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (window.AthenaForm?.chili?.submit) {
            window.AthenaForm.chili.submit();
            return;
        }

        if (window.main?.chili?.submit) {
            window.main.chili.submit();
        }
    });

    $(document).on("click.athenaForm", "[cmd='back']", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (state.backLocked) return;

        const previousStep = steps.getPreviousStep();

        if (previousStep) {
            steps.switchToStep(previousStep);
        }

        state.backLocked = true;
    });
}

export function startSystemLoops() {
    if (typeof window.refreshLenis === "function") {
        window.refresher = setInterval(function () {
            window.refreshLenis();
        }, 500);
    }

    window.autofillPoll = setInterval(() => {
        const $search = $(":-internal-autofill-selected");

        if ($search.length) {
            const currentStep = window.AthenaForm?.steps?.getCurrentStep?.();

            if (currentStep) {
                $(`[step="${currentStep}"]`)
                    .find("input, select")
                    .removeAttr("solo");
            }
        }
    }, 500);
}