/*global Ember */
export default Ember.Route.extend({
  queryParams: {
    search: {
      replace: false
    },
    play:{
      replace: false
    }
  },
  model: function(params) {
    return Ember.$.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&q='+params.search+'&type=video&key=AIzaSyCKWpWmxIveoFrIx4C1Ey6b5mHeajg7SgE').then(function(data) {
      if(params.play !== "undefined"){
        data.play = params.play;
      }else{
        data.play =  data.items[0].id.videoId;
      }
      var favs = localStorage.getItem('favs');
      data.faves = JSON.parse(favs);
      return data;
    });
  }

});
