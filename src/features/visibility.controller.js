// src/features/visibility.controller.js

export function createVisibilityController({
    state,
    config,
}) {
    const visibilityConfig = config.visibility || {};

    function isEnabled() {
        return visibilityConfig.enabled === true;
    }

    function normalize(value) {
        return String(value || "").trim();
    }

    function parseFlags(value) {
        return String(value || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function getGlobalFlags() {
        const globalName = visibilityConfig.globalName || "__ATHENA_FLAGS__";
        const rawFlags = window[globalName];

        if (Array.isArray(rawFlags)) {
            return rawFlags.map(normalize).filter(Boolean);
        }

        if (typeof rawFlags === "string") {
            return parseFlags(rawFlags);
        }

        return [];
    }

    function hasFlag(flag) {
        return state.visibilityFlags.includes(flag);
    }

    function syncFromGlobal() {
        const globalFlags = getGlobalFlags();

        globalFlags.forEach((flag) => {
            enable(flag, {
                apply: false,
            });
        });
    }

    function matchesAnyFlag(requiredFlags) {
        return requiredFlags.some((flag) => {
            return hasFlag(flag);
        });
    }

    function applyElements() {
        const selector =
            visibilityConfig.selectors?.elements ||
            "[data-athena-show]";

        const attr =
            visibilityConfig.attributes?.elements ||
            "data-athena-show";

        $(selector).each(function () {
            const $el = $(this);
            const requiredFlags = parseFlags($el.attr(attr));

            if (matchesAnyFlag(requiredFlags)) {
                $el.attr("data-athena-active", "true");
                $el.removeAttr("hidden");
                $el.show();
            } else {
                $el.removeAttr("data-athena-active");
                $el.attr("hidden", "");
                $el.hide();
            }
        });
    }

    function applyReferrerRules() {
        const rules = visibilityConfig.referrerRules || [];
        const referrer = document.referrer || "";

        if (!referrer) return;

        rules.forEach((rule) => {
            if (!rule.referrerIncludes || !rule.flag) return;

            if (referrer.includes(rule.referrerIncludes)) {
                enable(rule.flag, {
                    apply: false,
                });
            }
        });
    }

    function applySteps() {
        const selector =
            visibilityConfig.selectors?.steps ||
            "[data-athena-step-flag]";

        const attr =
            visibilityConfig.attributes?.steps ||
            "data-athena-step-flag";

        $(selector).each(function () {
            const $step = $(this);
            const requiredFlags = parseFlags($step.attr(attr));

            if (matchesAnyFlag(requiredFlags)) {
                $step.attr("data-athena-active", "true");
                $step.removeAttr("skip");
            } else {
                $step.removeAttr("data-athena-active");
                $step.attr("skip", "");
            }
        });
    }

    function apply() {
        if (!isEnabled()) return;

        syncFromGlobal();
        applyElements();
        applySteps();

        window.AthenaForm?.steps?.updateProgressBar?.();
    }

    function enable(flag, options = {}) {
        const cleanFlag = normalize(flag);

        if (!cleanFlag) return;

        if (!state.visibilityFlags.includes(cleanFlag)) {
            state.visibilityFlags.push(cleanFlag);
        }

        if (options.apply !== false) {
            apply();
        }
    }

    function disable(flag, options = {}) {
        const cleanFlag = normalize(flag);

        state.visibilityFlags = state.visibilityFlags.filter((item) => {
            return item !== cleanFlag;
        });

        if (options.apply !== false) {
            apply();
        }
    }

    function reset() {
        state.visibilityFlags = [];
        apply();
    }

    function init() {
        if (!isEnabled()) return;

        syncFromGlobal();
        applyReferrerRules();
        apply();
    }

    return {
        init,
        apply,
        enable,
        disable,
        reset,
        hasFlag,
        syncFromGlobal,
    };
}