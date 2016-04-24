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

  var inspector_filter_list = document.getElementById("inspector-filter-list");
  var inspector_filter_add = document.getElementById("inspector-filter-add");
  inspector_filter_add.addEventListener("click", function(e) {
    // TODO
    var bubble = document.createElement("li");
    bubble.appendChild(document.createTextNode("Department of Veterans Affairs"));
    var deleteButton = document.createElement("div");
    deleteButton.setAttribute("class", "delete-filter");
    deleteButton.addEventListener("click", function(e) {
      inspector_filter_list.removeChild(bubble);
    });
    bubble.appendChild(deleteButton);
    var input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", "inspector");
    input.setAttribute("value", "va");
    bubble.appendChild(input);
    inspector_filter_list.appendChild(bubble);
  });

  var server_side_buttons = document.querySelectorAll(".delete-filter");
  for (var i = 0; i < server_side_buttons.length; i++) {
    var button = server_side_buttons[i];
    button.addEventListener("click", function(e) {
      button.parentNode.parentNode.removeChild(button.parentNode);
    });
  }

  var date_filter_clear = document.getElementById("date-filter-clear");
  var date_start = document.getElementById("date-start");
  var date_end = document.getElementById("date-end");
  date_filter_clear.addEventListener("click", function(e) {
    date_start.value = "";
    date_end.value = "";
  });
})();
