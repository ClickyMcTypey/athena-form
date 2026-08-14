function updateProgressBar() {
  const currentStep = getCurrentStep();

  const completeSteps = config.progressCompleteSteps || [];

  if (completeSteps.includes(String(currentStep))) {
    $(".progressbar-progress").css("width", "100%");
    return;
  }

  const $steps = $("[step]").not(
    "[step=error], [step=loading], [step=loading_chili], [step=closed], [step=email], [step=info], [step=calendar], [step=call], [step=call-t3], [skip]"
  );

  const length = $steps.length;
  if (!length) return;

  const currentElement = $(`[step="${currentStep}"]`)[0];

  const rawIndex = $steps.index(currentElement);

  if (rawIndex < 0) {
    return;
  }

  const currentIndex = rawIndex + 1;
  const percentage = (currentIndex / length) * 100;

  $(".progressbar-progress").css("width", `${percentage}%`);
}