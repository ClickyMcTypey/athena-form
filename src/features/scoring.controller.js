// src/features/scoring.controller.js

export function createScoringController({
  state,
  config,
}) {
  const scoringConfig = config.scoring || {};

  function isEnabled() {
    return scoringConfig.enabled === true;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getFieldValue(fieldName) {
    const $checked = $(`[name="${fieldName}"]:checked`);

    if ($checked.length) {
      return $checked.val();
    }

    const $field = $(`[name="${fieldName}"]`).first();

    if ($field.length) {
      return $field.val();
    }

    return null;
  }

  function getUtmValue(fieldName) {
    if (state.utmParams?.[fieldName]) {
      return state.utmParams[fieldName];
    }

    const $field = $(`[name="${fieldName}"]`).first();

    if ($field.length) {
      return $field.val();
    }

    return null;
  }

  function valueMatches(actualValue, expectedValues = []) {
    if (!actualValue) return false;

    const actualParts = String(actualValue)
      .split(";")
      .map(normalize)
      .filter(Boolean);

    const expectedParts = expectedValues
      .map(normalize)
      .filter(Boolean);

    return expectedParts.some((expected) => {
      return actualParts.includes(expected);
    });
  }

  function getRuleValue(rule) {
    if (rule.source === "field") {
      return getFieldValue(rule.field);
    }

    if (rule.source === "utm") {
      return getUtmValue(rule.field);
    }

    return null;
  }

  function evaluateRule(rule) {
    const actualValue = getRuleValue(rule);

    const matched = valueMatches(
      actualValue,
      rule.values || []
    );

    return {
      id: rule.id,
      label: rule.label || rule.id,
      field: rule.field,
      source: rule.source,
      actualValue,
      points: matched ? Number(rule.points || 0) : 0,
      matched,
    };
  }

  function getTier(score) {
    const tiers = [...(scoringConfig.tiers || [])].sort((a, b) => {
      return Number(b.minScore) - Number(a.minScore);
    });

    const matchedTier = tiers.find((tier) => {
      return score >= Number(tier.minScore);
    });

    return matchedTier?.name || "";
  }

  function ensureHiddenField(name) {
    if (!name) return null;

    let $field = $(`[name="${name}"]`).first();

    if ($field.length) {
      return $field;
    }

    const $form = $("#athn_form");

    if (!$form.length) {
      console.warn(`Cannot create hidden scoring field: ${name}. #athn_form not found.`);
      return null;
    }

    $field = $("<input>", {
      type: "hidden",
      name,
    });

    $form.append($field);

    return $field;
  }

  function writeHiddenFields(result) {
    const fields = scoringConfig.outputFields || {};

    const $scoreField = ensureHiddenField(fields.score);
    const $tierField = ensureHiddenField(fields.tier);
    const $breakdownField = ensureHiddenField(fields.breakdown);

    if ($scoreField) {
      $scoreField.val(String(result.score));
    }

    if ($tierField) {
      $tierField.val(result.tier);
    }

    if ($breakdownField) {
      $breakdownField.val(JSON.stringify(result.matchedRules));
    }
  }

  function calculate() {
    if (!isEnabled()) {
      return {
        score: 0,
        tier: "",
        matchedRules: [],
        allRules: [],
      };
    }

    const allRules = (scoringConfig.rules || []).map(evaluateRule);

    const matchedRules = allRules.filter((rule) => rule.matched);

    const score = matchedRules.reduce((total, rule) => {
      return total + rule.points;
    }, 0);

    const tier = getTier(score);

    return {
      score,
      tier,
      matchedRules,
      allRules,
    };
  }

  function calculateAndWrite() {
    const result = calculate();

    writeHiddenFields(result);

    console.log("Lead scoring result:", result);

    return result;
  }

  return {
    calculate,
    calculateAndWrite,
    writeHiddenFields,
  };
}