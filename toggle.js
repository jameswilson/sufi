document.addEventListener("DOMContentLoaded", function () {

  const id = "#light-mode";
  const checkbox = document.querySelector(id);

  // Check if the localStorage variable exists and update the checkbox state.
  checkbox.checked = localStorage.getItem(id);

  // Monitor for changes to the checkbox state.
  checkbox.addEventListener("change", function () {
    localStorage.setItem(id, checkbox.checked);
  });
});
