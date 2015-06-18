/*global Ember */
export default Ember.ObjectController.extend({
  actions: {
    fav: function(vid){
      var favs = localStorage.getItem("favs");
      favs = JSON.parse(favs);
      if(!favs ||  favs.length <= 0){
        favs = [];
      }
      favs.push(vid);
      favs = JSON.stringify(favs);
      localStorage.setItem("favs", favs);
      favs = JSON.parse(favs);
      this.set('faves', favs);
    },
    unFav: function(ind){
      var favs = localStorage.getItem("favs");
      favs = JSON.parse(favs);
      favs.splice(ind,1);
      favs = JSON.stringify(favs);
      localStorage.setItem("favs", favs);
      favs = JSON.parse(favs);
      this.set('faves', favs);
    },
    searchVideos: function () {
      var query = this.get('search');
      localStorage.setItem("lastSearch", query);
      var play = this.get('play');
      if (query !== undefined && query !== " " && query.length>1) {
        var self = this;
        Ember.$.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&q='+query+'&type=video&key=AIzaSyCKWpWmxIveoFrIx4C1Ey6b5mHeajg7SgE').then(function(data) {
          data.search = query;
          if(play === "undefined"){
            data.play =  data.items[0].id.videoId;
          }else{
            data.play = play;
          }
          localStorage.setItem("lastVideo", data.play);
          var favs = localStorage.getItem('favs');
          data.faves = JSON.parse(favs);
          self.transitionToRoute('search', data);
        });
      }
    }
  }
});

