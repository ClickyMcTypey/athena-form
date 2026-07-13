// src/features/steps.controller.js
import { getRandomDelay } from "../utils/random.js";

export function createStepsController({
  dom,
  state,
  config,
  animations,
}) {

  function shouldHideBackButton(stepName) {
    return config.noBackButtonSteps?.includes(String(stepName));
  }

  function updateBackButtonForStep(stepName) {
    if (shouldHideBackButton(stepName)) {
      animations.toggleBackButton("hide");
    } else {
      animations.toggleBackButton("show");
    }
  }

  function getVisibleStepElements() {
    return Object.values($("[step]").not("[skip]"));
  }

  function getInitialStep() {
    const availableSteps = getAvailableSteps();

    return (
      config.steps?.initialStep ||
      availableSteps[0] ||
      "1"
    );
  }

  function showInitialStep() {
    if (state.hasInitializedStep) return;

    const initialStep = getInitialStep();

    $("[step]").hide();
    $(`[step="${initialStep}"]`).show();

    state.currentStep = initialStep;
    state.hasInitializedStep = true;
  }

  function getCurrentStep() {
    let currentStep = null;

    $("[step]").not("[skip]").each(function () {
      if ($(this).css("display") !== "none") {
        currentStep = $(this).attr("step");
      }
    });

    state.currentStep = currentStep;
    return currentStep;
  }

  function getNextStep() {
    const currentStep = getCurrentStep();
    const availableSteps = getAvailableSteps();

    const currentIndex = availableSteps.indexOf(currentStep);

    if (currentIndex === -1) return availableSteps[0] || null;

    return availableSteps[currentIndex + 1] || null;
  }

  function getPreviousStep() {
    const currentStep = getCurrentStep();
    const availableSteps = getAvailableSteps();

    const currentIndex = availableSteps.indexOf(currentStep);

    if (currentIndex <= 0) return null;

    return availableSteps[currentIndex - 1] || null;
  }

  function getSteps() {
    const previousStep = getPreviousStep();
    const nextStep = getNextStep();

    const previousStepElement = $(`[step="${previousStep}"]`)[0];
    const nextStepElement = $(`[step="${nextStep}"]`)[0];

    const steps = getVisibleStepElements();

    const previousStepIndex = steps.indexOf(previousStepElement);
    const nextStepIndex = steps.indexOf(nextStepElement);

    return [previousStepIndex, nextStepIndex];
  }

  function updateProgressBar() {
    const $steps = $("[step]").not(
      "[step=error], [step=loading], [step=loading_chili], [step=closed], [skip]"
    );

    const length = $steps.length;
    if (!length) return;

    const currentStep = getCurrentStep();
    const currentElement = $(`[step="${currentStep}"]`)[0];

    const currentIndex = $steps.index(currentElement) + 1;
    const percentage = (currentIndex / length) * 100;

    $(".progressbar-progress").css("width", `${percentage}%`);
  }

  function shouldShowProgressBar(targetStepName) {
    return config.progressSteps.includes(targetStepName);
  }

  function getAvailableSteps() {
    const excludedSteps = ["loading", "loading_chili", "calendar", "success", "error", "closed"];

    return $("[step]")
      .filter(function () {
        const $step = $(this);
        const stepName = String($step.attr("step") || "");

        if (!stepName) return false;
        if (excludedSteps.includes(stepName)) return false;
        if ($step.is("[skip]")) return false;
        if ($step.is("[prefilled]")) return false;

        return true;
      })
      .map(function () {
        return String($(this).attr("step"));
      })
      .get();
  }

  function stepInit() {
    state.backLocked = false;
    state.nextLocked = false;

    showInitialStep();

    updateProgressBar();

    const currentStep = getCurrentStep();

    if (shouldHideBackButton(currentStep)) {
      animations.toggleBackButton("hide");
    }

    if (currentStep === "loading") {
      const xp = Math.floor(Math.random() * 4) + 3;
      $("#xp_num").html(xp);

      $("[step=loading]")
        .delay(getRandomDelay(3000, 5000))
        .queue(function (next) {
          animations.fadeOutLeft($("[step=loading]"));
          animations.fadeInRight($("[step=email]"));
          next();
        });
    }

    if (currentStep === "email") {
      const $loadingStep = $("[step=loading]");

      if ($loadingStep.length) {
        $loadingStep.remove();
      }
    }
  }

  function switchToStep(targetStep) {
    const currentStep = getCurrentStep();

    const currentStepElement = $(`[step="${currentStep}"]`)[0];
    const destinationStepElement = $(`[step="${targetStep}"]`)[0];

    if (!currentStepElement || !destinationStepElement) return;

    const targetStepName = $(destinationStepElement).attr("step");
    updateBackButtonForStep(targetStepName);
    const steps = getVisibleStepElements();

    const currentStepIndex = steps.indexOf(currentStepElement);
    const destinationStepIndex = steps.indexOf(destinationStepElement);

    const isDestinationValidated = $(destinationStepElement)
      .closest("[step]")
      .attr("validated");

    if (isDestinationValidated) {
      const $targetProceedMask = $(`[step="${targetStep}"] [mask=proceed]`);

      if ($targetProceedMask.css("height") === "0px") {
        $targetProceedMask.css({
          height: "auto",
          opacity: 1,
        });
      }
    }

    if (shouldShowProgressBar(targetStepName)) {
      animations.toggleProgressBar("show");
    } else {
      animations.toggleProgressBar("hide");
    }

    if (shouldHideBackButton(targetStepName)) {
      animations.toggleBackButton("hide");
    }

    if (currentStepIndex > destinationStepIndex) {
      animations.fadeOutRight(currentStepElement);
      animations.fadeInLeft(destinationStepElement, stepInit);
    }

    if (currentStepIndex < destinationStepIndex) {
      animations.fadeOutLeft(currentStepElement);
      animations.fadeInRight(destinationStepElement, stepInit);
    }

    updateProgressBar();
  }

  return {
    getCurrentStep,
    getNextStep,
    getPreviousStep,
    getSteps,
    switchToStep,
    stepInit,
    updateProgressBar,
  };
}