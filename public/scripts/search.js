(function() {
  var all_reports = document.getElementById("checkbox-all-reports");
  var filters = [document.getElementById("checkbox-unreleased"),
                 document.getElementById("checkbox-foiad"),
                 document.getElementById("checkbox-featured")];

  all_reports.addEventListener("change", function(e) {
    if (all_reports.checked) {
      for (var i = 0; i < filters.length; i++) {
        filters[i].checked = false;
      }
    } else {
      all_reports.checked = true;
    }
  });

  for (var i = 0; i < filters.length; i++) {
    filters[i].addEventListener("change", function(e) {
      if (e.target.checked) {
        all_reports.checked = false;
      } else {
        var all_cleared = true;
        for (var j = 0; j < filters.length; j++) {
          if (filters[j].checked) {
            all_cleared = false;
            break;
          }
        }
        if (all_cleared) {
          all_reports.checked = true;
        }
      }
    });
  }
})();
