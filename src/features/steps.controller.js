// src/features/steps.controller.js
import { getRandomDelay } from "../utils/random.js";

export function createStepsController({
  dom,
  state,
  config,
  animations,
}) {

  let revealTimers = [];

  function clearRevealTimers() {
    revealTimers.forEach((timer) => clearTimeout(timer));
    revealTimers = [];
  }

  function setupRevealElement($el) {
    if ($el.attr("data-reveal-ready") === "true") return;

    const originalText = $el.text().trim();

    if (!originalText) return;

    $el.attr("data-reveal-original", originalText);

    const words = originalText.split(/\s+/);

    const html = words
      .map((word) => `<span class="word-reveal">${word}</span>`)
      .join(" ");

    $el.html(html);
    $el.attr("data-reveal-ready", "true");
  }

  function resetRevealElement($el) {
    setupRevealElement($el);

    $el.find(".word-reveal").removeClass("is-visible");
  }

  function startRevealForElement($el) {
    resetRevealElement($el);

    const duration = Number($el.attr("reveal"));

    if (!duration || Number.isNaN(duration)) return;

    const $words = $el.find(".word-reveal");

    if (!$words.length) return;

    const fadeDuration = 120;
    const totalWords = $words.length;

    if (totalWords === 1) {
      $words.first().addClass("is-visible");
      return;
    }

    // Last word starts early enough to finish fading by the total duration
    const revealDuration = Math.max(duration - fadeDuration, 0);
    const interval = revealDuration / (totalWords - 1);

    $words.each(function (index) {
      const word = this;

      const timer = setTimeout(() => {
        $(word).addClass("is-visible");
      }, interval * index);

      revealTimers.push(timer);
    });
  }

  function startRevealForStep(stepName) {
    clearRevealTimers();

    const $step = $(`[step="${stepName}"]`).first();

    if (!$step.length) return;

    $step.find("[reveal]").each(function () {
      startRevealForElement($(this));
    });
  }

  let $activeAutoNextProgress = null;

  function getAutoNextProgressBar($step) {
    let $bar = $step.children("[autonext-progress]").first();

    if (!$bar.length) {
      $bar = $('<div autonext-progress></div>');
      $step.prepend($bar);
    }

    return $bar;
  }

  function resetAutoNextProgress() {
    if ($activeAutoNextProgress?.length) {
      $activeAutoNextProgress.stop(true, true).css({
        width: "0%"
      });
    }

    $activeAutoNextProgress = null;
  }

  function startAutoNextProgress($step, delay) {
    const $bar = getAutoNextProgressBar($step);

    $bar.stop(true, true).css({
      width: "0%"
    });

    $activeAutoNextProgress = $bar;

    $bar.animate(
      {
        width: "100%"
      },
      delay,
      "linear"
    );
  }

  function showProceedMaskForStep(stepName) {
    const $mask = $(`[step="${stepName}"] [mask="proceed"]`).first();

    if (!$mask.length) return;

    setTimeout(() => {
      const $button = $mask.find('[cmd="proceed"]').first();

      const buttonHeight =
        $button.outerHeight(true) ||
        $mask.children().first().outerHeight(true) ||
        $mask[0].scrollHeight;

      const paddingTop = parseFloat($mask.css("padding-top")) || 0;
      const paddingBottom = parseFloat($mask.css("padding-bottom")) || 0;

      $mask.stop(true, true).css({
        height: `${buttonHeight + paddingTop + paddingBottom}px`,
        opacity: 1,
        overflow: "visible"
      });
    }, 300);
  }

  let autoNextTimer = null;

  function clearAutoNextTimer() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }

    resetAutoNextProgress();
  }

  function scheduleAutoNext(stepName) {
    clearAutoNextTimer();

    const $step = $(`[step="${stepName}"]`).first();

    if (!$step.length) return;

    const delay = Number($step.attr("autonext"));

    if (!delay || Number.isNaN(delay)) return;

    // If already auto-nexted, do not auto-next again.
    // Just reveal continue button after slide animation settles.
    if ($step.attr("data-autonext-fired") === "true") {
      setTimeout(() => {
        showProceedMaskForStep(stepName);
      }, 300);

      return;
    }

    startAutoNextProgress($step, delay);

    autoNextTimer = setTimeout(() => {
      autoNextTimer = null;

      const currentStep = getCurrentStep();

      if (currentStep !== stepName) return;
      if ($step.attr("data-autonext-fired") === "true") return;

      $step.attr("data-autonext-fired", "true");

      const nextStep = getNextStep();

      if (!nextStep) return;

      // No delay here.
      // Auto-next happens exactly when progress reaches 100%.
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

    startRevealForStep(currentStep);

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
    clearAutoNextTimer();

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