// src/ui/animations.js

export function createAnimations({ config }) {
    const animationTime = config.animationTime || 300;

    function refreshLenisSafe() {
        if (typeof window.refreshLenis === "function") {
            window.refreshLenis();
        }
    }

    return {
        toggleBackButton(mode) {
            const $mask = $("[mask=nav_back]");

            if (mode === "show") {
                const $button = $mask.children("div");
                $mask.animate(
                    { width: `${$button.outerWidth(true)}px` },
                    animationTime
                );
            } else {
                $mask.animate({ width: "0px" }, animationTime);
            }
        },

        toggleProgressBar(mode) {
            const $mask = $("[mask=progressbar]");

            if (mode === "show") {
                const $bar = $mask.children("div");
                $mask
                    .delay(100)
                    .animate(
                        { height: `${$bar.outerHeight(true)}px` },
                        animationTime + 100
                    );
            } else {
                $mask.animate({ height: "0px" }, animationTime);
            }
        },

        fadeInForm() {
            $(".signup-b-content-default").animate({ opacity: 1 }, 1000);
        },

        fadeOutLeft(element) {
            const $el = $(element);

            $el.animate({ left: "-10%", opacity: 0 }, animationTime, () => {
                const originalDisplay = $el.css("display");

                $el.attr("originalDisplay", originalDisplay);
                $el.css({
                    display: "none",
                    left: "0",
                });
            });
        },

        fadeInLeft(element, callback) {
            const $el = $(element);
            const originalDisplay = $el.attr("originalDisplay");

            $el.css({
                left: "-15%",
                opacity: 0,
                display: originalDisplay || "block",
            });

            $el
                .delay(100)
                .animate(
                    { left: "0", opacity: 1 },
                    animationTime + 100
                )
                .queue(function (next) {
                    refreshLenisSafe();

                    if (typeof callback === "function") {
                        callback();
                    }

                    next();
                });
        },

        fadeOutRight(element) {
            const $el = $(element);

            $el.animate({ right: "-10%", opacity: 0 }, animationTime, () => {
                const originalDisplay = $el.css("display");

                $el.attr("originalDisplay", originalDisplay);
                $el.css({
                    display: "none",
                    right: "0",
                });
            });
        },

        fadeInRight(element, callback) {
            const $el = $(element);
            const originalDisplay = $el.attr("originalDisplay");

            $el.css({
                right: "-15%",
                opacity: 0,
                display: originalDisplay || "block",
            });

            $el
                .delay(100)
                .animate(
                    { right: "0", opacity: 1 },
                    animationTime + 100
                )
                .queue(function (next) {
                    refreshLenisSafe();

                    if (typeof callback === "function") {
                        callback();
                    }

                    next();
                });
        },
        toggleContinueButton(mode, targetStep) {
            const $step = $(`[step="${targetStep}"]`);

            const $continueMask = $step
                .find("[mask=proceed]")
                .not(":has([last])");

            const $submitBtn = $step.find("[cmd=proceed][last]");

            $continueMask.finish();

            const isSubmitStep = targetStep === "info";

            if (mode === "show") {
                if (isSubmitStep && $submitBtn.length) {
                    $submitBtn.prop("disabled", false).removeClass("disabled");
                    return;
                }

                const $continueButton = $continueMask.children("div");

                $continueMask
                    .animate(
                        {
                            height: `${$continueButton.outerHeight(true)}px`,
                            opacity: 1,
                        },
                        animationTime
                    )
                    .queue(function (next) {
                        refreshLenisSafe();
                        next();
                    });

                return;
            }

            if (isSubmitStep && $submitBtn.length) {
                $submitBtn.prop("disabled", true).addClass("disabled");
                return;
            }

            $continueMask
                .animate(
                    {
                        height: "0px",
                        opacity: 0,
                    },
                    animationTime
                )
                .queue(function (next) {
                    refreshLenisSafe();
                    next();
                });
        },
    };
}