// src/app.js

window.__ATHENA_NEW_APP__ = true;

import { FORM_CONFIG } from "./config/form.config.js";
import { state } from "./core/state.js";
import { createDom } from "./core/dom.js";
import { createAnimations } from "./ui/animations.js";
import { createStepsController } from "./features/steps.controller.js";
import { createValidationService } from "./features/validation.service.js";
import { bindEvents, startSystemLoops } from "./core/events.js";
import { createPhoneService } from "./integrations/phone.service.js";
import { createFieldRenderer } from "./ui/field-renderer.js";
import { createHubspotService } from "./integrations/hubspot.service.js";
import { createPrefillController } from "./features/prefill.controller.js";
import { createAttributionService } from "./integrations/attribution.service.js";
import { createReferralRockService } from "./integrations/referralrock.service.js";
import { createSubmissionController } from "./features/submission.controller.js";
import { createChiliService } from "./integrations/chili.service.js";
import { createBranchController } from "./features/branch.controller.js";



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

    const branching = createBranchController({
        state,
        config: FORM_CONFIG,
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
        config: FORM_CONFIG,
        fieldRenderer,
    });

    const prefill = createPrefillController({
        state,
        config: FORM_CONFIG,
    });

    const attribution = createAttributionService({
        state,
        config: FORM_CONFIG,
    });

    const referralRock = createReferralRockService();

    const chili = createChiliService({
        state,
        config: FORM_CONFIG,
        steps,
        attribution,
        referralRock,
    });

    const submission = createSubmissionController({
        state,
        config: FORM_CONFIG,
        steps,
        animations,
        hubspot,
        attribution,
    });

    async function start() {
        try {

            hubspot.createEmbeddedForm();

            await hubspot.waitForForm();

            hubspot.fetchData();
            hubspot.renderCustomFields();
            hubspot.removeOriginalHubspotForm();

            bindEvents({
                state,
                steps,
                validation,
                animations,
                branching,
            });

            startSystemLoops();

            // Do not block form UI while capturing IP
            hubspot.captureIp();

            phone.init();

            $("#hdyhau_secondary").hide();

            prefill.init();

            branching.init();

            animations.fadeInForm();

            $("[step='1']")
                .delay(100)
                .queue(function (next) {
                    animations.fadeInLeft($(this), steps.stepInit);
                    next();
                });

            console.log("Athena form started");
        } catch (error) {
            console.error("Athena form failed to start:", error);
        }
    }

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
        prefill,
        attribution,
        referralRock,
        submission,
        chili,
        branching,
        start,
    };

    // Compatibility shell

    // window.attribution = {
    //     checkGA4: attribution.checkGA4,
    //     retrieve: attribution.retrieve,
    //     fire: attribution.fire,
    //     bingEC: attribution.bingEC,
    //     vowelCheck: attribution.vowelCheck,

    //     fireRR() {
    //         if (window.AthenaForm?.referralRock?.fireFromCurrentForm) {
    //             return window.AthenaForm.referralRock.fireFromCurrentForm();
    //         }

    //         return false;
    //     },
    // };

    console.log("Athena form app initialized");

    start();
});