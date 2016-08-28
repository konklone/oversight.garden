$().ready(function() {
  $(".js-accordion-trigger").bind("click", function(e) {
    $(jQuery(this).parent().find(".submenu")[0]).slideToggle("fast");
    jQuery(this).parent().toggleClass("is-expanded");
    e.preventDefault();
  });
});
