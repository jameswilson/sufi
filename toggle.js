
// Toggle light mode.
const id = "#light-mode";

document.addEventListener("DOMContentLoaded", function () {

  const checkbox = document.querySelector(id);

  // Check if the localStorage variable exists and update the checkbox state.
  if (checkbox) {
    checkbox.checked = localStorage.getItem(id);

    // Monitor for changes to the checkbox state.
    checkbox.addEventListener("change", function () {
      localStorage.setItem(id, checkbox.checked);
    });
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === id) {
    const checkbox = document.querySelector(id);
    if (checkbox) {
      checkbox.checked = event.newValue === "true";
    }
  }
});

if (window.self !== window.top) {
  document.documentElement.classList.add("iframe");
} else {
  document.documentElement.classList.remove("iframe");
}
