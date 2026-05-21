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

  function getFieldValues(fieldName) {
    const values = [];

    const $checked = $(`[name="${fieldName}"]:checked`);

    if ($checked.length) {
      $checked.each(function () {
        values.push($(this).val());
      });

      return values;
    }

    const $field = $(`[name="${fieldName}"]`).first();

    if (!$field.length) return [];

    const value = $field.val();

    if (!value) return [];

    return String(value)
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function getUtmValues(fieldName) {
    const value =
      state.utmParams?.[fieldName] ||
      $(`[name="${fieldName}"]`).first().val();

    if (!value) return [];

    return [value];
  }

  function getQuestionValues(question) {
    if (question.source === "field") {
      return getFieldValues(question.field);
    }

    if (question.source === "utm") {
      return getUtmValues(question.field);
    }

    return [];
  }

  function getOptionPoints(question, value) {
    const options = question.options || {};
    const normalizedValue = normalize(value);

    const matchedKey = Object.keys(options).find((key) => {
      return normalize(key) === normalizedValue;
    });

    if (!matchedKey) return 0;

    return Number(options[matchedKey] || 0);
  }

  function evaluateQuestion(question) {
    const values = getQuestionValues(question);

    const rawPoints = values.reduce((total, value) => {
      return total + getOptionPoints(question, value);
    }, 0);

    const maxPoints =
      question.maxPoints === undefined || question.maxPoints === null
        ? rawPoints
        : Number(question.maxPoints);

    const points = Math.min(rawPoints, maxPoints);

    return {
      id: question.id,
      field: question.field,
      source: question.source,
      values,
      rawPoints,
      maxPoints,
      points,
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

    if ($scoreField) {
      $scoreField.val(String(result.score));
    }

    if ($tierField) {
      $tierField.val(result.tier);
    }
  }

  function calculate() {
    if (!isEnabled()) {
      return {
        score: 0,
        tier: "",
        questions: [],
      };
    }

    const questions = (scoringConfig.questions || []).map(evaluateQuestion);

    const score = questions.reduce((total, question) => {
      return total + question.points;
    }, 0);

    const tier = getTier(score);

    return {
      score,
      tier,
      questions,
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