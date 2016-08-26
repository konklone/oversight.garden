document.getElementById("tinyletter-form").addEventListener("submit", function() {
  // Open a popup with the window name of "popupwindow" right before submitting
  // the email signup form. Since the form has a target of popupwindow, it will
  // submit the form into the newly opened popup.
  window.open("https://tinyletter.com/oversight", "popupwindow", "scrollbars=yes,width=800,height=600");
  return true;
});
