import Ember from 'ember';
import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';
import config from './config/environment';

Ember.MODEL_FACTORY_INJECTIONS = true;
Ember.Handlebars.helper('trimString', function(value) {
  var str = value.substr(0,90);
  if(value.length>90){
    str +="...";
  }

  return new Ember.Handlebars.SafeString(str);
});
Ember.Handlebars.helper('trimShort', function(value) {
  var str = value.substr(0,40);
  if(value.length>40){
    str +="...";
  }
  return new Ember.Handlebars.SafeString(str);
});

Ember.Handlebars.helper('embed', function(value) {
  return new Ember.Handlebars.SafeString('<iframe class="embed-responsive-item" frameborder="0" src="https://www.youtube.com/embed/'+value+'?autoplay=1" allowfullscreen></iframe>');
});
var App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver: Resolver
});
loadInitializers(App, config.modulePrefix);

export default App;
