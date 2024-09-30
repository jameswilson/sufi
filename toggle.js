document.addEventListener("DOMContentLoaded", function () {

  const id = "#light-mode";
  const checkbox = document.querySelector(id);

  // Check if the localStorage variable exists and update the checkbox state.
  checkbox.checked = localStorage.getItem(id);

  // Monitor for changes to the checkbox state.
  checkbox.addEventListener("change", function () {
    if (checkbox.checked) {
      // Set the localStorage item when checkbox is checked.
      localStorage.setItem(id, true);
    } else {
      // Remove the localStorage item when checkbox is unchecked.
      localStorage.removeItem(id);
    }
  });
});
