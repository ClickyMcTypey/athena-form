// src/features/branch.controller.js

export function createBranchController({
  state,
  config,
}) {
  function normalizeBranch(value) {
    if (value === null || value === undefined) return null;
    return String(value).trim();
  }

  function getStepBranches(element) {
    const rawBranches = $(element).attr("branches");

    if (!rawBranches) return [];

    return rawBranches
      .split(",")
      .map((branch) => branch.trim())
      .filter(Boolean);
  }

  function stepMatchesBranch(element, branchId) {
    const branches = getStepBranches(element);

    if (!branches.length) return true;

    return branches.includes(String(branchId));
  }

  function applyBranchVisibility() {
    const currentBranch = normalizeBranch(state.currentBranch);

    $("[branches]").each(function () {
      const $step = $(this);

      // Keep prefilled steps skipped if your prefill controller marks them
      if ($step.attr("prefilled") !== undefined) {
        $step.attr("skip", "");
        return;
      }

      if (!currentBranch) {
        $step.attr("skip", "");
        return;
      }

      if (stepMatchesBranch(this, currentBranch)) {
        $step.removeAttr("skip");
      } else {
        $step.attr("skip", "");
      }
    });
  }

  function setBranch(branchId) {
    const normalizedBranch = normalizeBranch(branchId);

    state.currentBranch = normalizedBranch;

    applyBranchVisibility();

    //hidden log
    //console.log("Current branch:", normalizedBranch);

    return normalizedBranch;
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
      return rule.fallbackBranch || "1";
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
        return String(globalValue);
      }

      return override.fallbackBranch || rule.fallbackBranch || "1";
    }

    const mappedBranch = rule.map?.[selectedValue];

    if (mappedBranch) {
      return mappedBranch;
    }

    return rule.fallbackBranch || "1";
  }

  function applyFromStep(stepName) {
    if (!config.branching?.enabled) return null;

    const branch = getBranchFromStep(stepName);

    if (!branch) return null;

    return setBranch(branch);
  }

  function reset() {
    state.currentBranch = null;
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