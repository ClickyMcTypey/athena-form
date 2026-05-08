// src/app.js

import { FORM_CONFIG } from "./config/form.config.js";
import { state } from "./core/state.js";
import { createDom } from "./core/dom.js";
import { createAnimations } from "./ui/animations.js";
import { createStepsController } from "./features/steps.controller.js";
import { createValidationService } from "./features/validation.service.js";

document.addEventListener("DOMContentLoaded", () => {
    const dom = createDom();

    const animations = createAnimations({
        config: FORM_CONFIG,
    });

    const steps = createStepsController({
        dom,
        state,
        config: FORM_CONFIG,
        animations,
    });

    window.main = window.main || {};

    window.main.getCurrentStep = steps.getCurrentStep;
    window.main.getNextStep = steps.getNextStep;
    window.main.getPreviousStep = steps.getPreviousStep;
    window.main.getSteps = steps.getSteps;
    window.main.switchToStep = steps.switchToStep;

    window.main.form = window.main.form || {};
    window.main.form.updateProgressBar = steps.updateProgressBar;

    window.AthenaForm = {
        config: FORM_CONFIG,
        state,
        dom,
        animations,
        steps,
    };

    console.log("Athena form app initialized");
});