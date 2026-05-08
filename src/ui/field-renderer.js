// src/ui/field-renderer.js

export function createFieldRenderer() {
  function getHubspotField(fieldName) {
    return $(`.hs_${fieldName}`);
  }

  function getFieldType($hubspotField) {
    if ($hubspotField.hasClass("hs-fieldtype-radio")) return "radio";
    if ($hubspotField.hasClass("hs-fieldtype-checkbox")) return "checkbox";
    if ($hubspotField.hasClass("hs-fieldtype-select")) return "select";
    if ($hubspotField.hasClass("hs-fieldtype-text")) return "text";
    if ($hubspotField.hasClass("hs-fieldtype-phonenumber")) return "phone";

    return null;
  }

  function renderCheckbox(fieldName, $hubspotField) {
    const $choicesContainer = $(`[hsfield="${fieldName}"]`).find("[choices]");
    if (!$choicesContainer.length) return;

    $choicesContainer.empty();

    const checkboxMinimum = Number($hubspotField.attr("minimum") || 1);

    const $hiddenInput = $("<input>", {
      type: "hidden",
      name: fieldName,
      min: checkboxMinimum,
    });

    $choicesContainer.append($hiddenInput);

    $hubspotField.find("li").each(function (index) {
      const text = $(this).text();
      const value = $(this).find("input").val();
      const id = `${fieldName}-option${index + 1}`;

      const $wrapper = $("<div>", {
        class: "signup-input checkbox",
      });

      const $input = $("<input>", {
        type: "checkbox",
        id,
        for: fieldName,
        value,
      });

      const $label = $("<label>", {
        for: id,
        text,
      });

      $wrapper.append($input, $label);
      $choicesContainer.append($wrapper);
    });
  }

  function renderRadio(fieldName, $hubspotField) {
    const $choicesContainer = $(`[hsfield="${fieldName}"]`).find("[choices]");
    if (!$choicesContainer.length) return;

    $choicesContainer.empty();

    $hubspotField.find("li").each(function (index) {
      const text = $(this).text();
      const value = $(this).find("input").val();
      const id = `${fieldName}-option${index + 1}`;

      const $wrapper = $("<div>", {
        class: "signup-input radio",
      });

      const $input = $("<input>", {
        type: "radio",
        id,
        name: fieldName,
        value,
      });

      const $label = $("<label>", {
        for: id,
        text,
      });

      $wrapper.append($input, $label);
      $choicesContainer.append($wrapper);
    });
  }

  function renderSelect(fieldName, $hubspotField) {
    const $container = $(`[${fieldName}]`);
    if (!$container.length) return;

    $container.empty();

    const $wrapper = $("<div>", {
      class: "signup-input select",
    });

    const $select = $("<select>", {
      name: fieldName,
      solo: "",
    });

    let $options = $hubspotField.find("option");

    // fallback for your hdyhau select behavior
    if (!$options.length && fieldName.includes("hdyhau")) {
      $options = $(".hs_hdyhau_primary").find("option");
    }

    $options.each(function () {
      const $clonedOption = $(this).clone();
      $select.append($clonedOption);
    });

    $wrapper.append($select);
    $container.append($wrapper);

    $container.find("option:disabled").attr("selected", "");
  }

  function renderField(fieldName) {
    const $hubspotField = getHubspotField(fieldName);
    if (!$hubspotField.length) {
      console.warn(`HubSpot field not found: ${fieldName}`);
      return;
    }

    const type = getFieldType($hubspotField);

    if (type === "checkbox") {
      renderCheckbox(fieldName, $hubspotField);
      return;
    }

    if (type === "radio") {
      renderRadio(fieldName, $hubspotField);
      return;
    }

    if (type === "select") {
      renderSelect(fieldName, $hubspotField);
      return;
    }

    // text and phone fields are already built in your Webflow markup
  }

  return {
    renderField,
    renderCheckbox,
    renderRadio,
    renderSelect,
  };
}