// src/features/branch.controller.js

export function createBranchController({
  state,
  config,
}) {
  function normalizeBranch(value) {
    if (value === null || value === undefined) return null;
    return String(value).trim();
  }

  function normalizeBranches(value) {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.map(String).map((item) => item.trim()).filter(Boolean);
    }

    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function getStepBranches(element) {
    return normalizeBranches($(element).attr("branches"));
  }

  function stepMatchesBranches(element, activeBranches) {
    const stepBranches = getStepBranches(element);

    // No [branches] means global
    if (!stepBranches.length) return true;

    if (!activeBranches.length) return false;

    return stepBranches.some((branch) => activeBranches.includes(branch));
  }

  function applyBranchVisibility() {
    const activeBranches = normalizeBranches(
      state.currentBranches || state.currentBranch
    );

    $("[branches]").each(function () {
      const $step = $(this);

      // Keep prefilled steps skipped if your prefill controller marks them
      if ($step.attr("prefilled") !== undefined) {
        $step.attr("skip", "");
        return;
      }

      if (!activeBranches.length) {
        $step.attr("skip", "");
        return;
      }

      if (stepMatchesBranches(this, activeBranches)) {
        $step.removeAttr("skip");
      } else {
        $step.attr("skip", "");
      }
    });
  }

  function setBranch(branchId) {
    const normalizedBranches = normalizeBranches(branchId);

    state.currentBranches = normalizedBranches;

    // Keep this for backward compatibility
    state.currentBranch = normalizedBranches[0] || null;

    applyBranchVisibility();

    return normalizedBranches;
  }

  function getSelectedValueForRule(stepName, rule) {
    if (!rule?.field) return null;

    const $selected = $(
      `[step="${stepName}"] [name="${rule.field}"]:checked`
    );

    if ($selected.length) {
      return $selected.val();
    }

    const $field = $(`[step="${stepName}"] [name="${rule.field}"]`);

    if ($field.length) {
      return $field.val();
    }

    return null;
  }

  function getBranchFromStep(stepName) {
    const rules = config.branching?.rules || {};
    const rule = rules[String(stepName)];

    if (!rule) return null;

    const selectedValue = getSelectedValueForRule(stepName, rule);

    if (!selectedValue) {
      return normalizeBranches(rule.fallbackBranch || "1");
    }

    const override = rule.experimentOverrides?.[selectedValue];

    if (override) {
      const globalValue =
        window[override.globalName] ||
        sessionStorage.getItem(override.storageKey);

      if (
        globalValue &&
        override.allowedBranches?.includes(String(globalValue))
      ) {
        return normalizeBranches(globalValue);
      }

      return normalizeBranches(override.fallbackBranch || rule.fallbackBranch || "1");
    }

    const mappedBranch = rule.map?.[selectedValue];

    if (mappedBranch) {
      return normalizeBranches(mappedBranch);
    }

    return normalizeBranches(rule.fallbackBranch || "1");
  }

  function applyFromStep(stepName) {
    if (!config.branching?.enabled) return null;

    const branch = getBranchFromStep(stepName);

    if (!branch) return null;

    return setBranch(branch);
  }

  function reset() {
    state.currentBranch = null;
    state.currentBranches = [];
    applyBranchVisibility();
  }

  function init() {
    if (!config.branching?.enabled) return;

    applyBranchVisibility();
  }

  return {
    init,
    reset,
    setBranch,
    applyFromStep,
    applyBranchVisibility,
    getBranchFromStep,
  };
}