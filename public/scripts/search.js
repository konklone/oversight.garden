(function() {
  var all_reports = document.getElementById("checkbox-all-reports");
  var filters = [document.getElementById("checkbox-unreleased"),
                 document.getElementById("checkbox-foiad"),
                 document.getElementById("checkbox-featured")];
  var form = all_reports.form;

  all_reports.addEventListener("change", function(e) {
    if (all_reports.checked) {
      for (var i = 0; i < filters.length; i++) {
        filters[i].checked = false;
      }
      form.submit();
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
      form.submit();
    });
  }

  var date_filter_clear = document.getElementById("date-filter-clear");
  var date_start = document.getElementById("date-start");
  var date_end = document.getElementById("date-end");

  date_start.addEventListener("change", function() {
    form.submit();
  });

  date_end.addEventListener("change", function() {
    form.submit();
  });

  date_filter_clear.addEventListener("click", function(e) {
    date_start.value = "";
    date_end.value = "";
    form.submit();
  });

  $(".chosen-select").chosen().change(function() {
    form.submit();
  });
})();
