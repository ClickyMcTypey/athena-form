// src/features/progress.controller.js

export function createProgressController() {
  return {
    update() {
      const $steps = $("[step]").not(
        "[step=error], [step=loading], [step=loading_chili], [step=closed], [skip]"
      );

      const length = $steps.length;
      if (!length) return;

      const currentStep = this.getCurrentStep?.() || null;
      const currentElement = $(`[step="${currentStep}"]`)[0];

      const currentIndex = $steps.index(currentElement) + 1;
      const percentage = (currentIndex / length) * 100;

      $(".progressbar-progress").css("width", `${percentage}%`);
    },
  };
}