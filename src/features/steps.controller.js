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

    function wrapTextNode(textNode) {
      const text = textNode.nodeValue;

      if (!text || !text.trim()) return;

      const parts = text.split(/(\s+)/);
      const fragment = document.createDocumentFragment();

      parts.forEach((part) => {
        if (!part) return;

        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }

        const span = document.createElement("span");
        span.className = "word-reveal";
        span.textContent = part;
        fragment.appendChild(span);
      });

      textNode.parentNode.replaceChild(fragment, textNode);
    }

    function walk(node) {
      const childNodes = Array.from(node.childNodes);

      childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          wrapTextNode(child);
          return;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) return;

        if (child.classList.contains("word-reveal")) return;
        if (["SCRIPT", "STYLE"].includes(child.tagName)) return;

        walk(child);
      });
    }

    walk($el[0]);

    $el.attr("data-reveal-ready", "true");
  }

  function showAllRevealWords($el) {
    setupRevealElement($el);

    $el.attr("data-reveal-active", "true");
    $el.find(".word-reveal").addClass("is-visible");
  }

  function scheduleRevealForElement($el, startDelay) {
    setupRevealElement($el);

    // Already revealed once: show instantly, do not replay
    if ($el.attr("data-reveal-fired") === "true") {
      showAllRevealWords($el);
      return 0;
    }

    const duration = Number($el.attr("reveal"));

    if (!duration || Number.isNaN(duration)) {
      showAllRevealWords($el);
      return 0;
    }

    const $words = $el.find(".word-reveal");

    if (!$words.length) return 0;

    $el.removeAttr("data-reveal-active");
    $words.removeClass("is-visible");

    const startTimer = setTimeout(() => {
      $el.attr("data-reveal-fired", "true");
      $el.attr("data-reveal-active", "true");

      const fadeDuration = 120;
      const totalWords = $words.length;

      if (totalWords === 1) {
        $words.first().addClass("is-visible");
        return;
      }

      const revealDuration = Math.max(duration - fadeDuration, 0);
      const interval = revealDuration / (totalWords - 1);

      $words.each(function (index) {
        const word = this;

        const wordTimer = setTimeout(() => {
          $(word).addClass("is-visible");
        }, interval * index);

        revealTimers.push(wordTimer);
      });
    }, startDelay);

    revealTimers.push(startTimer);

    // This controls when the next [reveal] element starts
    return duration;
  }

  function startRevealForStep(stepName) {
    clearRevealTimers();

    const $step = $(`[step="${stepName}"]`).first();

    if (!$step.length) return;

    const $reveals = $step
      .find("[reveal]")
      .filter(function () {
        // Avoid nested reveal elements causing double scheduling
        return $(this).parents("[reveal]").length === 0;
      });

    let cumulativeDelay = 0;

    $reveals.each(function () {
      const duration = scheduleRevealForElement($(this), cumulativeDelay);

      cumulativeDelay += duration;
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

    if ($step.attr("data-autonext-fired") === "true") {
      showProceedMaskForStep(stepName);
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