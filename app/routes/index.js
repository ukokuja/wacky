/*global Ember */
export default Ember.Route.extend({
  model: function() {
    var last = {};
    last["search"] = localStorage.getItem("lastSearch") != null ? localStorage.getItem("lastSearch")  : "";
    last["play"] = localStorage.getItem("lastVideo") != null ? localStorage.getItem("lastVideo")  : "t_FtdkPrpXE";
    return last;
  }

});
