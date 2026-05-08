// src/app.js

import { FORM_CONFIG } from "./config/form.config.js";
import { state } from "./core/state.js";
import { createDom } from "./core/dom.js";

document.addEventListener("DOMContentLoaded", () => {
  const dom = createDom();

  window.AthenaForm = {
    config: FORM_CONFIG,
    state,
    dom,
  };

  console.log("Athena form app initialized");
});