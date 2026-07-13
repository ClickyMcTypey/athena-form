// src/features/steps.controller.js
import { getRandomDelay } from "../utils/random.js";

export function createStepsController({
  dom,
  state,
  config,
  animations,
}) {

  let autoNextTimer = null;

  function clearAutoNextTimer() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }
  }

  function scheduleAutoNext(stepName) {
    clearAutoNextTimer();

    const $step = $(`[step="${stepName}"]`).first();

    if (!$step.length) return;

    const delay = Number($step.attr("autonext"));

    if (!delay || Number.isNaN(delay)) return;

    // Prevent this step from auto-nexting more than once
    if ($step.attr("data-autonext-fired") === "true") return;

    autoNextTimer = setTimeout(() => {
      const currentStep = getCurrentStep();

      // User already moved away manually
      if (currentStep !== stepName) return;

      // Extra safety
      if ($step.attr("data-autonext-fired") === "true") return;

      $step.attr("data-autonext-fired", "true");

      const nextStep = getNextStep();

      if (!nextStep) return;

      switchToStep(nextStep);
    }, delay);
  }

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
    return $("[step]").not("[skip]").toArray();
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
    const currentElement = $(`[step="${currentStep}"]`)[0];
    const steps = getVisibleStepElements();

    const currentIndex = steps.indexOf(currentElement);
    const nextElement = steps[currentIndex + 1];

    return nextElement ? $(nextElement).attr("step") : null;
  }

  function getPreviousStep() {
    const currentStep = getCurrentStep();
    const currentElement = $(`[step="${currentStep}"]`)[0];
    const steps = getVisibleStepElements();

    const currentIndex = steps.indexOf(currentElement);
    const previousElement = steps[currentIndex - 1];

    return previousElement ? $(previousElement).attr("step") : null;
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

  function stepInit() {
    state.backLocked = false;
    state.nextLocked = false;

    updateProgressBar();

    const currentStep = getCurrentStep();

    scheduleAutoNext(currentStep);

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

    scheduleAutoNext(currentStep);

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