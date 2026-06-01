// src/integrations/chili.service.js

export function createChiliService({
  state,
  config,
  steps,
  attribution,
  referralRock,
  errorLogger,
}) {
  const meetingDescription =
    "This is a no-commitment conversation with us. We’ll explain how Athena works, answer any questions, and discuss whether an Executive Assistant makes sense for you right now.";

  function getLeadData() {
    return {
      email: $('[name="email"]').val(),
      firstName: $('[name="firstname"]').val(),
      lastName: $('[name="lastname"]').val(),
    };
  }

  function normalizeSlotData(data) {
    // Supports both possible shapes:
    // data
    // data.slot
    if (data?.slot) return data.slot;
    return data;
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  function showLoggedChiliError({
    type = "chilipiper_on_error",
    message = "ChiliPiper error",
    stack = "",
    extra = {},
  } = {}) {
    state.isChiliSubmitting = false;

    errorLogger?.logError?.({
      type,
      message,
      stack,
      extra: {
        error_stage: "chilipiper",
        hubspot_submitted: "true",
        chili_payload: safeStringify(extra.chili_payload || ""),
        ...extra,
      },
    });

    attribution?.fire?.("error");
    steps.switchToStep("error");
  }

  function formatToCalendarDate(isoDateString) {
    return isoDateString.replace(/-|:|\.\d+/g, "");
  }

  function getGoogleCalLink(
    data,
    title = "Discovery Call",
    description = meetingDescription
  ) {
    const start = formatToCalendarDate(data.start);
    const end = formatToCalendarDate(data.end);

    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";

    const params = new URLSearchParams({
      text: title,
      dates: `${start}/${end}`,
      details: description,
    });

    return `${baseUrl}&${params.toString()}`;
  }

  function downloadICS(
    data,
    title = "Discovery Call",
    description = meetingDescription
  ) {
    const start = formatToCalendarDate(data.start);
    const end = formatToCalendarDate(data.end);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${document.URL}
DTSTART:${start}
DTEND:${end}
SUMMARY:${title}
DESCRIPTION:${description}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });

    const link = document.createElement("a");

    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", "meeting.ics");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function displaySlotTime(rawData) {
    const data = normalizeSlotData(rawData);

    if (!data?.start || !data?.end) {
      console.warn("Missing ChiliPiper slot data", rawData);
      return;
    }

    const startDate = new Date(data.start);
    const endDate = new Date(data.end);

    const readableDate = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const startTime = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const endTime = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    $("#chili_date").html(readableDate);
    $("#chili_time").html(`${startTime} - ${endTime}`);

    $("#chili_google").attr(
      "href",
      getGoogleCalLink(data)
    );

    const appleBtn = document.getElementById("chili_apple");

    if (!appleBtn) return;

    const newAppleBtn = appleBtn.cloneNode(true);
    appleBtn.parentNode.replaceChild(newAppleBtn, appleBtn);

    newAppleBtn.addEventListener("click", () => {
      downloadICS(data);
    });
  }

  function processSuccess(slotData) {
    displaySlotTime(slotData);
    steps.switchToStep("success");
  }

  function submit() {
    if (state.isChiliSubmitting) return;

    if (!window.ChiliPiper?.submit) {
      console.warn("ChiliPiper is not loaded");

      showLoggedChiliError({
        type: "chilipiper_not_loaded",
        message: "ChiliPiper submit handler was not available",
      });

      return;
    }

    state.isChiliSubmitting = true;

    const lead = getLeadData();

    if (referralRock?.fireFromCurrentForm) {
      referralRock.fireFromCurrentForm();
    }

    window.ChiliPiper.submit(config.chili.tenant, config.chili.router, {
      lead: {
        Email: lead.email,
        FirstName: lead.firstName,
        LastName: lead.lastName,
        hubspotutk: state.hubspotUtk || window.ut,
      },

      formIds: config.chili.formIds,

      onSuccess(data) {
        state.chiliData = data;
        state.isChiliSubmitting = false;
        state.successNoBook = true;

        attribution.fire("success");
        processSuccess(data);
      },

      onError(error) {
        showLoggedChiliError({
          type: "chilipiper_on_error",
          message: error?.message || "ChiliPiper onError triggered",
          stack: error?.stack || "",
          extra: {
            chili_payload: error || "",
          },
        });
      },

      onClose(data) {
        state.isChiliSubmitting = false;

        if (!state.successNoBook) {
          steps.switchToStep("closed");
          attribution.fire("closed");
          return;
        }

        const finalData = state.chiliData || data;

        if (finalData) {
          processSuccess(finalData);
        }
      },
    });
  }

  return {
    submit,
    processSuccess,
    displaySlotTime,
    getGoogleCalLink,
    downloadICS,
  };
}