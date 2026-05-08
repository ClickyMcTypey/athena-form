// src/app.js

import { FORM_CONFIG } from "./config/form.config.js";
import { state } from "./core/state.js";
import { createDom } from "./core/dom.js";
import { createAnimations } from "./ui/animations.js";
import { createStepsController } from "./features/steps.controller.js";
import { createValidationService } from "./features/validation.service.js";
import { bindEvents } from "./core/events.js";
import { createPhoneService } from "./integrations/phone.service.js";
import { createFieldRenderer } from "./ui/field-renderer.js";
import { createHubspotService } from "./integrations/hubspot.service.js";

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

    const validation = createValidationService({
        state,
        config: FORM_CONFIG,
        animations,
    });

    const phone = createPhoneService({
        state,
    });

    const fieldRenderer = createFieldRenderer();

    const hubspot = createHubspotService({
        state,
        fieldRenderer,
    });

    bindEvents({
        state,
        steps,
        validation,
        animations,
    });

    window.AthenaForm = {
        config: FORM_CONFIG,
        state,
        dom,
        animations,
        steps,
        validation,
        phone,
        fieldRenderer,
        hubspot,
    };

    window.main = window.main || {};
    window.main.form = window.main.form || {};
    window.main.hubspotForm = window.main.hubspotForm || {};

    window.main.getCurrentStep = steps.getCurrentStep;
    window.main.getNextStep = steps.getNextStep;
    window.main.getPreviousStep = steps.getPreviousStep;
    window.main.getSteps = steps.getSteps;
    window.main.switchToStep = steps.switchToStep;
    window.main.validateStep = validation.validateStep;
    window.main.hubspotForm.fetchData = hubspot.fetchData;
    window.main.form.fetchHubspotOptions = fieldRenderer.renderField;
    window.main.form.updateProgressBar = steps.updateProgressBar;

    window.main.form.initSteps = function () {
        hubspot.renderCustomFields();
        hubspot.removeOriginalHubspotForm();

        if (window.main?.setup?.initListeners) {
            window.main.setup.initListeners();
        }
    };

    console.log("Athena form app initialized");
});