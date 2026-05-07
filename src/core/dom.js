// src/core/dom.js

export function createDom() {
  return {
    getHubspotForm() {
      return $(".hbspt-form form")[0];
    },

    getAllSteps() {
      return $("[step]").not("[ignore]");
    },

    getVisibleSteps() {
      return $("[step]").not("[skip]");
    },

    getStep(step) {
      return $(`[step="${step}"]`);
    },

    getCurrentVisibleStep() {
      let current = null;

      this.getVisibleSteps().each(function () {
        if ($(this).css("display") !== "none") {
          current = $(this).attr("step");
        }
      });

      return current;
    },

    getProceedButtons() {
      return $("[cmd=proceed]");
    },

    getBackButton() {
      return $("[cmd=back]");
    },

    getChiliRetryButton() {
      return $("[cmd=chili_retry]");
    },

    getPhoneInput() {
      return document.querySelector("#prettyPhone");
    },

    getPrettyPhoneInput() {
      return $("#prettyPhone");
    },

    getProgressBar() {
      return $(".progressbar-progress");
    },
  };
}