define("temp-ember/app", 
  ["ember","ember/resolver","ember/load-initializers","temp-ember/config/environment","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var Resolver = __dependency2__["default"];
    var loadInitializers = __dependency3__["default"];
    var config = __dependency4__["default"];

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

    __exports__["default"] = App;
  });
define("temp-ember/components/lf-overlay", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Component.extend({
      tagName: 'span',
      classNames: ['lf-overlay'],
      didInsertElement: function() {
        Ember.$('body').addClass('lf-modal-open');
      },
      willDestroy: function() {
        Ember.$('body').removeClass('lf-modal-open');
      },
      click: function() {
        this.sendAction('clickAway');
      }
    });
  });
define("temp-ember/components/liquid-bind-c", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    __exports__["default"] = Ember.Component.extend({
      tagName: ''
    });
  });
define("temp-ember/components/liquid-measured", 
  ["liquid-fire/mutation-observer","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var MutationObserver = __dependency1__["default"];
    var Ember = __dependency2__["default"];

    __exports__["default"] = Ember.Component.extend({

      didInsertElement: function() {
        var self = this;

        // This prevents margin collapse
        this.$().css({
          border: '1px solid transparent',
          margin: '-1px'
        });

        this.didMutate();

        this.observer = new MutationObserver(function(mutations) { self.didMutate(mutations); });
        this.observer.observe(this.get('element'), {
          attributes: true,
          subtree: true,
          childList: true
        });
        this.$().bind('webkitTransitionEnd', function() { self.didMutate(); });
        // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
        window.addEventListener('unload', function(){ self.willDestroyElement(); });
      },

      willDestroyElement: function() {
        if (this.observer) {
          this.observer.disconnect();
        }
      },

      didMutate: function() {
        Ember.run.next(this, function() { this._didMutate(); });
      },

      _didMutate: function() {
        var elt = this.$();
        if (!elt || !elt[0]) { return; }

        // if jQuery sees a zero dimension, it will temporarily modify the
        // element's css to try to make its size measurable. But that's bad
        // for us here, because we'll get an infinite recursion of mutation
        // events. So we trap the zero case without hitting jQuery.

        if (elt[0].offsetWidth === 0) {
          this.set('width', 0);
        } else {
          this.set('width', elt.outerWidth());
        }
        if (elt[0].offsetHeight === 0) {
          this.set('height', 0);
        } else {
          this.set('height', elt.outerHeight());
        }
      }  

    });
  });
define("temp-ember/components/liquid-modal", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    __exports__["default"] = Ember.Component.extend({
      classNames: ['liquid-modal'],
      currentContext: Ember.computed.oneWay('owner.modalContexts.lastObject'),

      owner: null, // set by injection

      innerView: Ember.computed('currentContext', function() {
        var self = this,
            current = this.get('currentContext'),
            name = current.get('name'),
            container = this.get('container'),
            component = container.lookup('component-lookup:main').lookupFactory(name);
        Ember.assert("Tried to render a modal using component '" + name + "', but couldn't find it.", !!component);

        var args = Ember.copy(current.get('params'));

        args.registerMyself = Ember.on('init', function() {
          self.set('innerViewInstance', this);
        });

        // set source so we can bind other params to it
        args._source = Ember.computed(function() {
          return current.get("source");
        });

        var otherParams = current.get("options.otherParams");
        var from, to;
        for (from in otherParams) {
          to = otherParams[from];
          args[to] = Ember.computed.alias("_source."+from);
        }

        var actions = current.get("options.actions") || {};

        // Override sendAction in the modal component so we can intercept and
        // dynamically dispatch to the controller as expected
        args.sendAction = function(name) {
          var actionName = actions[name];
          if (!actionName) {
            this._super.apply(this, Array.prototype.slice.call(arguments));
            return;
          }

          var controller = current.get("source");
          var args = Array.prototype.slice.call(arguments, 1);
          args.unshift(actionName);
          controller.send.apply(controller, args);
        };

        return component.extend(args);
      }),

      actions: {
        outsideClick: function() {
          if (this.get('currentContext.options.dismissWithOutsideClick')) {
            this.send('dismiss');
          } else {
            proxyToInnerInstance(this, 'outsideClick');
          }
        },
        escape: function() {
          if (this.get('currentContext.options.dismissWithEscape')) {
            this.send('dismiss');
          } else {
            proxyToInnerInstance(this, 'escape');
          }
        },
        dismiss: function() {
          var source = this.get('currentContext.source'),
              proto = source.constructor.proto(),
              params = this.get('currentContext.options.withParams'),
              clearThem = {};

          for (var key in params) {
            clearThem[key] = proto[key];
          }
          source.setProperties(clearThem);
        }
      }
    });

    function proxyToInnerInstance(self, message) {
      var vi = self.get('innerViewInstance');
      if (vi) {
        vi.send(message);
      }
    }
  });
define("temp-ember/components/liquid-spacer", 
  ["ember","liquid-fire/promise","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var Promise = __dependency2__["default"];

    __exports__["default"] = Ember.Component.extend({
      growDuration: 250,
      growPixelsPerSecond: 200,
      growEasing: 'slide',
      enabled: true,
      
      didInsertElement: function() {
        var child = this.$('> div');
        this.$().css({
          overflow: 'hidden',
          width: child.width(),
          height: child.height()
        });
      },

      sizeChange: Ember.observer('width', 'height', function() {
        var elt = this.$();
        if (!this.get('enabled')) {
          elt.width(this.get('width'));
          elt.height(this.get('height'));
          return Promise.resolve();
        }
        return Promise.all([
          this.adaptDimension(elt, 'width'),
          this.adaptDimension(elt, 'height')
        ]);
      }),

      adaptDimension: function(elt, dimension) {
        var have = elt[dimension]();
        var want = this.get(dimension);
        var target = {};
        target[dimension] = want;

        return Ember.$.Velocity(elt[0], target, {
          duration: this.durationFor(have, want),
          queue: false,
          easing: this.get('growEasing')      
        });
      },

      durationFor: function(before, after) {
        return Math.min(this.get('growDuration'), 1000*Math.abs(before - after)/this.get('growPixelsPerSecond'));
      },

      
    });
  });
define("temp-ember/components/lm-container", 
  ["ember","liquid-fire/tabbable","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*
       Parts of this file were adapted from ic-modal

       https://github.com/instructure/ic-modal
       Released under The MIT License (MIT)
       Copyright (c) 2014 Instructure, Inc.
    */

    var Ember = __dependency1__["default"];

    /**
     * If you do something to move focus outside of the browser (like
     * command+l to go to the address bar) and then tab back into the
     * window, capture it and focus the first tabbable element in an active
     * modal.
     */
    var lastOpenedModal = null;
    Ember.$(document).on('focusin', handleTabIntoBrowser);

    function handleTabIntoBrowser() {
      if (lastOpenedModal) {
        lastOpenedModal.focus();
      }
    }


    __exports__["default"] = Ember.Component.extend({
      classNames: ['lm-container'],
      attributeBindings: ['tabindex'],
      tabindex: 0,

      keyUp: function(event) {
        // Escape key
        if (event.keyCode === 27) {
          this.sendAction();
        }
      },

      keyDown: function(event) {
        // Tab key
        if (event.keyCode === 9) {
          this.constrainTabNavigation(event);
        }
      },

      didInsertElement: function() {
        this.focus();
        lastOpenedModal = this;
      },

      willDestroy: function() {
        lastOpenedModal = null;
      },

      focus: function() {
        if (this.get('element').contains(document.activeElement)) {
          // just let it be if we already contain the activeElement
          return;
        }
        var target = this.$('[autofocus]');
        if (!target.length) {
          target = this.$(':tabbable');
        }

        if (!target.length) {
          target = this.$();
        }

        target[0].focus();
      },

      constrainTabNavigation: function(event) {
        var tabbable = this.$(':tabbable');
        var finalTabbable = tabbable[event.shiftKey ? 'first' : 'last']()[0];
        var leavingFinalTabbable = (
          finalTabbable === document.activeElement ||
            // handle immediate shift+tab after opening with mouse
            this.get('element') === document.activeElement
        );
        if (!leavingFinalTabbable) { return; }
        event.preventDefault();
        tabbable[event.shiftKey ? 'last' : 'first']()[0].focus();
      }
    });
  });
define("temp-ember/controllers/search", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global Ember */
    __exports__["default"] = Ember.ObjectController.extend({
      actions: {
        fav: function(vid){
          var favs = localStorage.getItem("favs");
          favs = JSON.parse(favs);
          if(!favs || favs.length == 0){
            favs = [];
          }
          favs.push(vid);
          this.set('faves', favs);
          localStorage.setItem("favs", JSON.stringify(favs));

        },
        unFav: function(ind){
          var favs = localStorage.getItem("favs");
          favs = JSON.parse(favs);
          favs.splice(ind,1);
          this.set('faves', favs);
          localStorage.setItem("favs", JSON.stringify(favs));

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
  });
define("temp-ember/helpers/liquid-bind", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* liquid-bind is really just liquid-with with a pre-provided block
       that just says {{this}} */
    var Ember = __dependency1__["default"];

    function liquidBindHelperFunc() {
      var options = arguments[arguments.length - 1];
      var container = options.data.view.container;
      var componentLookup = container.lookup('component-lookup:main');
      var cls = componentLookup.lookupFactory('liquid-bind-c');
      options.hash.value = arguments[0];
      options.hashTypes.value = options.types[0];

      if (options.hash['class']) {
        options.hash['innerClass'] = options.hash['class'];
        delete options.hash['class'];
        options.hashTypes['innerClass'] = options.hashTypes['class'];
        delete options.hashTypes['class'];
      }
      Ember.Handlebars.helpers.view.call(this, cls, options);
    }

    function htmlbarsLiquidBindHelper(params, hash, options, env) {
      var componentLookup = this.container.lookup('component-lookup:main');
      var cls = componentLookup.lookupFactory('liquid-bind-c');
      hash.value = params[0];
      if (hash['class']) {
        hash.innerClass = hash['class'];
        delete hash['class'];
      }
      env.helpers.view.helperFunction.call(this, [cls], hash, options, env);
    }

    var liquidBindHelper;

    if (Ember.HTMLBars) {
      liquidBindHelper = {
        isHTMLBars: true,
        helperFunction: htmlbarsLiquidBindHelper
      };
    } else {
      liquidBindHelper = liquidBindHelperFunc;
    }

    __exports__["default"] = liquidBindHelper;
  });
define("temp-ember/helpers/liquid-if", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    var isHTMLBars = !!Ember.HTMLBars;

    function factory(invert) {
      function helperFunc() {
        var property, hash, options, env, container;

        if (isHTMLBars) {
          property = arguments[0][0];
          hash = arguments[1];
          options = arguments[2];
          env = arguments[3];
          container = this.container;
        } else {
          property = arguments[0];
          options = arguments[1];
          hash = options.hash;
          container = options.data.view.container;
        }
        var View = container.lookupFactory('view:liquid-if');

        var templates = [options.fn || options.template, options.inverse];
        if (invert) {
          templates.reverse();
        }
        delete options.fn;
        delete options.template;
        delete options.inverse;

        if (hash.containerless) {
          View = View.extend(Ember._Metamorph);
        }

        hash.templates = templates;

        if (isHTMLBars) {
          hash.showFirst = property;
          env.helpers.view.helperFunction.call(this, [View], hash, options, env);
        } else {
          hash.showFirstBinding = property;
          return Ember.Handlebars.helpers.view.call(this, View, options);
        }
      }

      if (Ember.HTMLBars) {
        return {
          isHTMLBars: true,
          helperFunction: helperFunc,
          preprocessArguments: function() { }
        };
      } else {
        return helperFunc;
      }
    }

    __exports__.factory = factory;
    __exports__["default"] = factory(false);
  });
define("temp-ember/helpers/liquid-measure", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = function(){
      Ember.assert("liquid-measure is deprecated, see CHANGELOG.md", false);
    }
  });
define("temp-ember/helpers/liquid-outlet", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    var isHTMLBars = !!Ember.HTMLBars;

    function liquidOutletHelperFunc(property, options) {
      var property, options, container, hash, env;

      if (isHTMLBars) {
        property = arguments[0][0]; // params[0]
        hash = arguments[1];
        options = arguments[2];
        env = arguments[3];
        container = this.container;

        if (!property) {
          property = 'main';
          options.paramTypes = ['string'];
        }
      } else {
        property = arguments[0];

        if (property && property.data && property.data.isRenderData) {
          options = property;
          property = 'main';
          options.types = ['STRING'];
        }

        container = options.data.view.container;
        hash = options.hash;
      }

      var View = container.lookupFactory('view:liquid-outlet');
      if (hash.containerless) {
        View = View.extend(Ember._Metamorph);
      }
      hash.viewClass = View;

      if (isHTMLBars) {
        env.helpers.outlet.helperFunction.call(this, [property], hash, options, env);
      } else {
        return Ember.Handlebars.helpers.outlet.call(this, property, options);
      }
    }

    var liquidOutletHelper = liquidOutletHelperFunc;
    if (Ember.HTMLBars) {
      liquidOutletHelper = {
        isHTMLBars: true,
        helperFunction: liquidOutletHelperFunc,
        preprocessArguments: function() { }
      };
    }

    __exports__["default"] = liquidOutletHelper;
  });
define("temp-ember/helpers/liquid-unless", 
  ["temp-ember/helpers/liquid-if","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var factory = __dependency1__.factory;
    __exports__["default"] = factory(true);
  });
define("temp-ember/helpers/liquid-with", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    var isHTMLBars = !!Ember.HTMLBars;

    function liquidWithHelperFunc() {
      var params, context, options, container, innerOptions, data, hash, env;

      var innerOptions = {
        hashTypes: {}
      };

      var innerHash = {};

      if (isHTMLBars) {
        params = arguments[0]
        hash = arguments[1];
        options = arguments[2];
        env = arguments[3];
        context = params[0];
        container = this.container;
        data = arguments[3].data;
        innerOptions.morph = options.morph;

        if (params.length === 3) {
          hash.keywordName = params[2]._label;
          params = [context];
        }
        innerHash.boundContext = context;
      } else {
        params = Array.prototype.slice.apply(arguments, [0, -1]);
        context = arguments[0];
        options = arguments[arguments.length-1];
        data = options.data;
        hash = options.hash;
        container = data.view.container;
        innerOptions.data = data;
        innerOptions.hash = innerHash;
        innerHash.boundContextBinding = context;
      }

      var View = container.lookupFactory('view:liquid-with');

      View = View.extend({
        originalArgs: params,
        originalHash: hash,
        originalHashTypes: options.hashTypes,
        innerTemplate: options.fn || options.template
      });

      var containerless = (isHTMLBars && hash.containerless &&
                           (!hash.containerless.isStream || hash.containerless.value())) ||
          (!isHTMLBars &&
           ((options.hashTypes.containerless === 'BOOLEAN' && hash.containerless) ||
            (options.hashTypes.containerless === 'ID' && this.containerless))
          );

      if (containerless) {
        View = View.extend(Ember._Metamorph);
      }


      [
        'class',
        'classNames',
        'classNameBindings',
        'use',
        'id',
        'growDuration',
        'growPixelsPerSecond',
        'growEasing',
        'enableGrowth',
        'containerless'
      ].forEach(function(field){
        if (hash.hasOwnProperty(field)) {
          innerHash[field] = hash[field];
          innerOptions.hashTypes[field] = options.hashTypes ? options.hashTypes[field] : undefined;
        }
      });

      if (isHTMLBars) {
        env.helpers.view.helperFunction.call(this, [View], innerHash, innerOptions, env);
      } else {
        if (containerless) {
          delete innerOptions.hash['class'];
          delete innerOptions.hash['classNames'];
          delete innerOptions.hash['classNameBindings'];
        }
        return Ember.Handlebars.helpers.view.call(this, View, innerOptions);
      }
    }

    var liquidWithHelper = liquidWithHelperFunc;
    if (isHTMLBars) {
      liquidWithHelper = {
        isHTMLBars: true,
        helperFunction: liquidWithHelperFunc,
        preprocessArguments: function() { }
      };
    }

    __exports__["default"] = liquidWithHelper;
  });
define("temp-ember/helpers/with-apply", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    var isHTMLBars = !!Ember.HTMLBars;

    // This helper is internal to liquid-with.
    function withApplyHelperFunc() {
      var hash, options, env, view;

      if (isHTMLBars) {
        hash = arguments[1];
        options = arguments[2];
        env = arguments[3];
        view = this;
      } else {
        options = arguments[0];
        hash = options.hash;
        view = options.data.view;
      }

      var parent = view.get('liquidWithParent');
      var withArgs = parent.get('originalArgs').slice();

      withArgs[0] = 'lwith-view.boundContext';
      options = Ember.copy(options);

      // This works to inject our keyword in Ember >= 1.9
      if (!view._keywords) {
        view._keywords = {};
      }
      view._keywords['lwith-view'] = view;

      // This works to inject our keyword in Ember < 1.9
      if (!isHTMLBars) {
        if (!options.data.keywords) {
          options.data.keywords = {};
        }
        options.data.keywords['lwith-view'] = view;
      }

      if (isHTMLBars) {
        options.template = parent.get('innerTemplate');
      } else {
        options.fn = parent.get('innerTemplate');
      }

      hash = parent.get('originalHash');
      options.hashTypes = parent.get('originalHashTypes');

      if (isHTMLBars) {
        env.helpers["with"].helperFunction.call(this, [view.getStream(withArgs[0])], hash, options, env);
      } else {
        options.hash = hash;
        withArgs.push(options);
        return Ember.Handlebars.helpers["with"].apply(this, withArgs);
      }
    }

    var withApplyHelper = withApplyHelperFunc;
    if (Ember.HTMLBars) {
      withApplyHelper = {
        isHTMLBars: true,
        helperFunction: withApplyHelperFunc,
        preprocessArguments: function() { }
      };
    }

    __exports__["default"] = withApplyHelper;
  });
define("temp-ember/initializers/export-application-global", 
  ["ember","temp-ember/config/environment","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var config = __dependency2__["default"];

    function initialize(container, application) {
      var classifiedName = Ember.String.classify(config.modulePrefix);

      if (config.exportApplicationGlobal && !window[classifiedName]) {
        window[classifiedName] = application;
      }
    };
    __exports__.initialize = initialize;

    __exports__["default"] = {
      name: 'export-application-global',

      initialize: initialize
    };
  });
define("temp-ember/initializers/liquid-fire", 
  ["liquid-fire","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var initialize = __dependency1__.initialize;
    var Ember = __dependency2__["default"];

    __exports__["default"] = {
      name: 'liquid-fire',

      initialize: function(container) {
        if (!Ember.$.Velocity) {
          Ember.warn("Velocity.js is missing");
        } else {
          var version = Ember.$.Velocity.version;
          var recommended = [0, 11, 8];
          if (Ember.compare(recommended, [version.major, version.minor, version.patch]) === 1) {
            Ember.warn("You should probably upgrade Velocity.js, recommended minimum is " + recommended.join('.'));
          }
        }

        initialize(container);
      }
    };
  });
define("temp-ember/router", 
  ["ember","temp-ember/config/environment","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var config = __dependency2__["default"];

    var Router = Ember.Router.extend({
      location: config.locationType
    });

    Router.map(function() {
      this.resource('search', { path: '/search/:search/play/:play' }, function(){
      });
    });


    __exports__["default"] = Router;
  });
define("temp-ember/routes/index", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global Ember */
    __exports__["default"] = Ember.Route.extend({
      model: function() {
        var last = {};
        last["search"] = localStorage.getItem("lastSearch") != null ? localStorage.getItem("lastSearch")  : "";
        last["play"] = localStorage.getItem("lastVideo") != null ? localStorage.getItem("lastVideo")  : "t_FtdkPrpXE";
        return last;
      }

    });
  });
define("temp-ember/routes/search", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /*global Ember */
    __exports__["default"] = Ember.Route.extend({
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
  });
define("temp-ember/templates/application", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


      data.buffer.push(escapeExpression((helper = helpers.render || (depth0 && depth0.render),options={hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["STRING"],data:data},helper ? helper.call(depth0, "header-nav", options) : helperMissing.call(depth0, "render", "header-nav", options))));
      data.buffer.push("\n\n<div class=\"container\">\n  ");
      stack1 = helpers._triageMustache.call(depth0, "outlet", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n</div>\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/components/liquid-bind-c", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, self=this, helperMissing=helpers.helperMissing;

    function program1(depth0,data) {
      
      var buffer = '', stack1;
      data.buffer.push("\n  ");
      stack1 = helpers._triageMustache.call(depth0, "boundValue", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      }

      stack1 = (helper = helpers['liquid-with'] || (depth0 && depth0['liquid-with']),options={hash:{
        'class': ("innerClass"),
        'use': ("use"),
        'containerless': ("containerless")
      },hashTypes:{'class': "ID",'use': "ID",'containerless': "ID"},hashContexts:{'class': depth0,'use': depth0,'containerless': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data},helper ? helper.call(depth0, "value", "as", "boundValue", options) : helperMissing.call(depth0, "liquid-with", "value", "as", "boundValue", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/components/liquid-measured", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var stack1;


      stack1 = helpers._triageMustache.call(depth0, "yield", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      else { data.buffer.push(''); }
      
    });
  });
define("temp-ember/templates/components/liquid-modal", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

    function program1(depth0,data) {
      
      var buffer = '', stack1, helper, options;
      data.buffer.push("\n  ");
      stack1 = (helper = helpers['lm-container'] || (depth0 && depth0['lm-container']),options={hash:{
        'action': ("escape")
      },hashTypes:{'action': "STRING"},hashContexts:{'action': depth0},inverse:self.noop,fn:self.program(2, program2, data),contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "lm-container", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      }
    function program2(depth0,data) {
      
      var buffer = '', helper, options;
      data.buffer.push("\n    <div ");
      data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
        'class': (":lf-dialog cc.options.dialogClass")
      },hashTypes:{'class': "STRING"},hashContexts:{'class': depth0},contexts:[],types:[],data:data})));
      data.buffer.push(" role=\"dialog\" ");
      data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
        'aria-labelledby': ("cc.options.ariaLabelledBy"),
        'aria-label': ("cc.options.ariaLabel")
      },hashTypes:{'aria-labelledby': "STRING",'aria-label': "STRING"},hashContexts:{'aria-labelledby': depth0,'aria-label': depth0},contexts:[],types:[],data:data})));
      data.buffer.push(">\n      ");
      data.buffer.push(escapeExpression(helpers.view.call(depth0, "innerView", {hash:{
        'dismiss': ("dismiss")
      },hashTypes:{'dismiss': "STRING"},hashContexts:{'dismiss': depth0},contexts:[depth0],types:["ID"],data:data})));
      data.buffer.push("\n    </div>\n    ");
      data.buffer.push(escapeExpression((helper = helpers['lf-overlay'] || (depth0 && depth0['lf-overlay']),options={hash:{
        'clickAway': ("outsideClick")
      },hashTypes:{'clickAway': "STRING"},hashContexts:{'clickAway': depth0},contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "lf-overlay", options))));
      data.buffer.push("\n  ");
      return buffer;
      }

      stack1 = (helper = helpers['liquid-with'] || (depth0 && depth0['liquid-with']),options={hash:{
        'class': ("lm-with"),
        'containerless': (true)
      },hashTypes:{'class': "STRING",'containerless': "BOOLEAN"},hashContexts:{'class': depth0,'containerless': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data},helper ? helper.call(depth0, "currentContext", "as", "cc", options) : helperMissing.call(depth0, "liquid-with", "currentContext", "as", "cc", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/components/liquid-spacer", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var stack1, helper, options, self=this, helperMissing=helpers.helperMissing;

    function program1(depth0,data) {
      
      var buffer = '', stack1;
      data.buffer.push("\n  ");
      stack1 = helpers._triageMustache.call(depth0, "yield", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      }

      stack1 = (helper = helpers['liquid-measured'] || (depth0 && depth0['liquid-measured']),options={hash:{
        'width': ("width"),
        'height': ("height")
      },hashTypes:{'width': "ID",'height': "ID"},hashContexts:{'width': depth0,'height': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "liquid-measured", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      else { data.buffer.push(''); }
      
    });
  });
define("temp-ember/templates/header-nav", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, self=this, helperMissing=helpers.helperMissing;

    function program1(depth0,data) {
      
      
      data.buffer.push("\n        <img class=\"logo-brand\" src=\"http://2myyi21mszez474t4ur4n573.wpengine.netdna-cdn.com/wp-content/themes/totango/assets/img/global/totango_logo.png\">\n      ");
      }

      data.buffer.push("<nav class=\"navbar navbar-default\" role=\"navigation\">\n  <div class=\"container-fluid\">\n\n    <div class=\"navbar-header\">\n      </button>\n      ");
      stack1 = (helper = helpers['link-to'] || (depth0 && depth0['link-to']),options={hash:{
        'class': ("navbar-brand")
      },hashTypes:{'class': "STRING"},hashContexts:{'class': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["STRING"],data:data},helper ? helper.call(depth0, "index", options) : helperMissing.call(depth0, "link-to", "index", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n    </div>\n\n\n  </div>\n</nav>\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/index", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, self=this, helperMissing=helpers.helperMissing;

    function program1(depth0,data) {
      
      
      data.buffer.push("\n    <img src=\"wacky.jpg\"/>\n");
      }

      data.buffer.push("<h3>Welcome to the Wacky Media Player</h3>\n\n<p>\n  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Blanditiis eum ea odit, nam accusantium vitae sed excepturi, porro, consequuntur quae, animi hic officiis distinctio aperiam cumque. Porro, odit fugiat dolorum.\n</p>\n");
      stack1 = (helper = helpers.linkTo || (depth0 && depth0.linkTo),options={hash:{
        'replace': ("true"),
        'class': ("thumbnail")
      },hashTypes:{'replace': "STRING",'class': "STRING"},hashContexts:{'replace': depth0,'class': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0],types:["STRING","ID"],data:data},helper ? helper.call(depth0, "search", "", options) : helperMissing.call(depth0, "linkTo", "search", "", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/liquid-with-self", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1;


      stack1 = helpers._triageMustache.call(depth0, "value", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/liquid-with", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1;


      stack1 = helpers._triageMustache.call(depth0, "with-apply", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n\n\n");
      return buffer;
      
    });
  });
define("temp-ember/templates/search", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    __exports__["default"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
    this.compilerInfo = [4,'>= 1.0.0'];
    helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
      var buffer = '', stack1, helper, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

    function program1(depth0,data) {
      
      var buffer = '', stack1, helper, options;
      data.buffer.push("\n              <div class=\"row\">\n                  <div class=\"col-lg-12\">\n                      <button type=\"button\" ");
      data.buffer.push(escapeExpression(helpers.action.call(depth0, "fav", "video", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0,depth0],types:["STRING","ID"],data:data})));
      data.buffer.push(" class=\"btn btn-link\"><span class=\"ion-star gold-star\" aria-hidden=\"true\"></span>Add ");
      data.buffer.push(escapeExpression((helper = helpers.trimShort || (depth0 && depth0.trimShort),options={hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data},helper ? helper.call(depth0, "video.snippet.title", options) : helperMissing.call(depth0, "trimShort", "video.snippet.title", options))));
      data.buffer.push("</button>\n                    ");
      stack1 = (helper = helpers['link-to'] || (depth0 && depth0['link-to']),options={hash:{
        'replace': (true),
        'class': ("thumbnail")
      },hashTypes:{'replace': "BOOLEAN",'class': "STRING"},hashContexts:{'replace': depth0,'class': depth0},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0,depth0],types:["STRING","ID"],data:data},helper ? helper.call(depth0, "search", "video.id.videoId", options) : helperMissing.call(depth0, "link-to", "search", "video.id.videoId", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n                  </div>\n              </div>\n          ");
      return buffer;
      }
    function program2(depth0,data) {
      
      var buffer = '', stack1, helper, options;
      data.buffer.push("\n                        <img ");
      data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
        'src': ("video.snippet.thumbnails.medium.url")
      },hashTypes:{'src': "ID"},hashContexts:{'src': depth0},contexts:[],types:[],data:data})));
      data.buffer.push("/>\n                        <div class=\"caption\">\n                            <h4 >");
      stack1 = helpers._triageMustache.call(depth0, "video.snippet.title", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("</h4>\n                            <p>");
      data.buffer.push(escapeExpression((helper = helpers.trimString || (depth0 && depth0.trimString),options={hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data},helper ? helper.call(depth0, "video.snippet.description", options) : helperMissing.call(depth0, "trimString", "video.snippet.description", options))));
      data.buffer.push("</p>\n                        </div>\n                    ");
      return buffer;
      }

    function program4(depth0,data) {
      
      var buffer = '', helper, options;
      data.buffer.push("\n        <div class=\"well\">\n            <div class=\"embed-responsive embed-responsive-4by3\">\n              ");
      data.buffer.push(escapeExpression((helper = helpers.embed || (depth0 && depth0.embed),options={hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data},helper ? helper.call(depth0, "model.play", options) : helperMissing.call(depth0, "embed", "model.play", options))));
      data.buffer.push("\n            </div>\n        </div>\n    ");
      return buffer;
      }

    function program6(depth0,data) {
      
      var buffer = '', stack1;
      data.buffer.push("\n        ");
      stack1 = helpers.each.call(depth0, "fav", "in", "faves", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n    ");
      return buffer;
      }
    function program7(depth0,data) {
      
      var buffer = '', stack1, helper, options;
      data.buffer.push("\n            <div class=\"media\">\n                <div class=\"media-left\">\n                  ");
      stack1 = (helper = helpers['link-to'] || (depth0 && depth0['link-to']),options={hash:{
        'replace': (true),
        'class': ("thumbnail thumb-fav")
      },hashTypes:{'replace': "BOOLEAN",'class': "STRING"},hashContexts:{'replace': depth0,'class': depth0},inverse:self.noop,fn:self.program(8, program8, data),contexts:[depth0,depth0],types:["STRING","ID"],data:data},helper ? helper.call(depth0, "search", "fav.id.videoId", options) : helperMissing.call(depth0, "link-to", "search", "fav.id.videoId", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n                    </a>\n                </div>\n                <div class=\"media-body\">\n                    <h5 class=\"media-heading\">");
      stack1 = helpers._triageMustache.call(depth0, "fav.snippet.title", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("</h5>\n                    <p>\n                      ");
      stack1 = (helper = helpers['link-to'] || (depth0 && depth0['link-to']),options={hash:{
        'replace': (true),
        'type': ("button"),
        'class': ("btn btn-primary")
      },hashTypes:{'replace': "BOOLEAN",'type': "STRING",'class': "STRING"},hashContexts:{'replace': depth0,'type': depth0,'class': depth0},inverse:self.noop,fn:self.program(10, program10, data),contexts:[depth0,depth0],types:["STRING","ID"],data:data},helper ? helper.call(depth0, "search", "fav.id.videoId", options) : helperMissing.call(depth0, "link-to", "search", "fav.id.videoId", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n                        <button type=\"button\" class=\"btn btn-default\" ");
      data.buffer.push(escapeExpression(helpers.action.call(depth0, "unFav", "_view.contentIndex", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0,depth0],types:["STRING","ID"],data:data})));
      data.buffer.push(">Delete</button>\n                    </p>\n                </div>\n            </div>\n        ");
      return buffer;
      }
    function program8(depth0,data) {
      
      var buffer = '';
      data.buffer.push("\n                      <img class=\"media-object\"  ");
      data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
        'src': ("fav.snippet.thumbnails.medium.url")
      },hashTypes:{'src': "ID"},hashContexts:{'src': depth0},contexts:[],types:[],data:data})));
      data.buffer.push(" />\n                  ");
      return buffer;
      }

    function program10(depth0,data) {
      
      
      data.buffer.push("\n                          Play\n                      ");
      }

      data.buffer.push("<!-- Note: this is vanilla HTML. TODO: Emberify!-->\n<h2 class=\"left-padding gray\">Wacky Media Player</h2>\n<br>\n<div class=\"col-lg-4\">\n\n        <label for=\"email\" class=\"sr-only\">Email</label>\n        <div class=\"row\">\n            <div class=\"col-lg-12\">\n                <div class=\"input-group\">\n                    ");
      data.buffer.push(escapeExpression((helper = helpers.input || (depth0 && depth0.input),options={hash:{
        'type': ("text"),
        'value': ("search"),
        'insert-newline': ("searchVideos"),
        'class': ("form-control input-lg"),
        'placeholder': ("Search an artist or song")
      },hashTypes:{'type': "STRING",'value': "ID",'insert-newline': "STRING",'class': "STRING",'placeholder': "STRING"},hashContexts:{'type': depth0,'value': depth0,'insert-newline': depth0,'class': depth0,'placeholder': depth0},contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "input", options))));
      data.buffer.push("\n                    <span class=\"input-group-btn\">\n                      <button type=\"button\" class=\"btn btn-primary btn-lg\" ");
      data.buffer.push(escapeExpression(helpers.action.call(depth0, "searchVideos", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["STRING"],data:data})));
      data.buffer.push(">Search</button>\n                    </span>\n                </div>\n            </div>\n        </div>\n        <br/>\n          ");
      stack1 = helpers.each.call(depth0, "video", "in", "model.items", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n\n        <hr/>\n</div>\n\n<div class=\"col-lg-7\">\n    ");
      stack1 = helpers['if'].call(depth0, "model.play", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[depth0],types:["ID"],data:data});
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n  <div class=\"playlist\">\n    ");
      stack1 = (helper = helpers['liquid-spacer'] || (depth0 && depth0['liquid-spacer']),options={hash:{
        'growDuration': (250)
      },hashTypes:{'growDuration': "INTEGER"},hashContexts:{'growDuration': depth0},inverse:self.noop,fn:self.program(6, program6, data),contexts:[],types:[],data:data},helper ? helper.call(depth0, options) : helperMissing.call(depth0, "liquid-spacer", options));
      if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
      data.buffer.push("\n  </div>\n\n</div>\n");
      return buffer;
      
    });
  });
define("temp-ember/tests/app.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - .');
    test('app.js should pass jshint', function() { 
      ok(true, 'app.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/controllers/search.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - controllers');
    test('controllers/search.js should pass jshint', function() { 
      ok(false, 'controllers/search.js should pass jshint.\ncontrollers/search.js: line 7, col 33, Expected \'===\' and instead saw \'==\'.\n\n1 error'); 
    });
  });
define("temp-ember/tests/helpers/resolver", 
  ["ember/resolver","temp-ember/config/environment","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Resolver = __dependency1__["default"];
    var config = __dependency2__["default"];

    var resolver = Resolver.create();

    resolver.namespace = {
      modulePrefix: config.modulePrefix,
      podModulePrefix: config.podModulePrefix
    };

    __exports__["default"] = resolver;
  });
define("temp-ember/tests/helpers/start-app", 
  ["ember","temp-ember/app","temp-ember/router","temp-ember/config/environment","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var Application = __dependency2__["default"];
    var Router = __dependency3__["default"];
    var config = __dependency4__["default"];

    __exports__["default"] = function startApp(attrs) {
      var application;

      var attributes = Ember.merge({}, config.APP);
      attributes = Ember.merge(attributes, attrs); // use defaults, but you can override;

      Ember.run(function() {
        application = Application.create(attributes);
        application.setupForTesting();
        application.injectTestHelpers();
      });

      return application;
    }
  });
define("temp-ember/tests/router.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - .');
    test('router.js should pass jshint', function() { 
      ok(true, 'router.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/routes/index.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - routes');
    test('routes/index.js should pass jshint', function() { 
      ok(true, 'routes/index.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/routes/search.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - routes');
    test('routes/search.js should pass jshint', function() { 
      ok(true, 'routes/search.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/temp-ember/tests/helpers/resolver.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - temp-ember/tests/helpers');
    test('temp-ember/tests/helpers/resolver.js should pass jshint', function() { 
      ok(true, 'temp-ember/tests/helpers/resolver.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/temp-ember/tests/helpers/start-app.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - temp-ember/tests/helpers');
    test('temp-ember/tests/helpers/start-app.js should pass jshint', function() { 
      ok(true, 'temp-ember/tests/helpers/start-app.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/temp-ember/tests/test-helper.jshint", 
  [],
  function() {
    "use strict";
    module('JSHint - temp-ember/tests');
    test('temp-ember/tests/test-helper.js should pass jshint', function() { 
      ok(true, 'temp-ember/tests/test-helper.js should pass jshint.'); 
    });
  });
define("temp-ember/tests/test-helper", 
  ["temp-ember/tests/helpers/resolver","ember-qunit"],
  function(__dependency1__, __dependency2__) {
    "use strict";
    var resolver = __dependency1__["default"];
    var setResolver = __dependency2__.setResolver;

    setResolver(resolver);

    document.write('<div id="ember-testing-container"><div id="ember-testing"></div></div>');

    QUnit.config.urlConfig.push({ id: 'nocontainer', label: 'Hide container'});
    var containerVisibility = QUnit.urlParams.nocontainer ? 'hidden' : 'visible';
    document.getElementById('ember-testing-container').style.visibility = containerVisibility;
  });
define("temp-ember/transitions/cross-fade", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    // BEGIN-SNIPPET cross-fade-definition
    var animate = __dependency1__.animate;
    var stop = __dependency1__.stop;
    var Promise = __dependency1__.Promise;
    __exports__["default"] = function crossFade(oldView, insertNewView, opts) {
      stop(oldView);
      return insertNewView().then(function(newView) {
        return Promise.all([
          animate(oldView, {opacity: 0}, opts),
          animate(newView, {opacity: [1, 0]}, opts)
        ]);
      });
    }
    // END-SNIPPET
  });
define("temp-ember/transitions/fade", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    // BEGIN-SNIPPET fade-definition
    var isAnimating = __dependency1__.isAnimating;
    var finish = __dependency1__.finish;
    var timeSpent = __dependency1__.timeSpent;
    var animate = __dependency1__.animate;
    var stop = __dependency1__.stop;
    __exports__["default"] = function fade(oldView, insertNewView, opts) {
      var firstStep,
          outOpts = opts;

      if (isAnimating(oldView, 'fade-out')) {
        // if the old view is already fading out, let it finish.
        firstStep = finish(oldView, 'fade-out');
      } else {
        if (isAnimating(oldView, 'fade-in')) {
          // if the old view is partially faded in, scale its fade-out
          // duration appropriately.
          outOpts = { duration: timeSpent(oldView, 'fade-in') };
        }
        stop(oldView);
        firstStep = animate(oldView, {opacity: 0}, outOpts, 'fade-out');
      }

      return firstStep.then(insertNewView).then(function(newView){
        return animate(newView, {opacity: [1, 0]}, opts, 'fade-in');
      });
    }
    // END-SNIPPET
  });
define("temp-ember/transitions/flex-grow", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var animate = __dependency1__.animate;
    var stop = __dependency1__.stop;
    var Promise = __dependency1__.Promise;
    __exports__["default"] = function flexGrow(oldView, insertNewView, opts) {
      stop(oldView);
      return insertNewView().then(function(newView) {
        return Promise.all([
          animate(oldView, {'flex-grow': 0}, opts),
          animate(newView, {'flex-grow': [1, 0]}, opts)
        ]);
      });
    }
  });
define("temp-ember/transitions/modal-popup", 
  ["ember","liquid-fire","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var Promise = __dependency2__.Promise;
    var Velocity = Ember.$.Velocity;

    function hideModal(oldView) {
      var box, obscure;
      if (!oldView ||
          !(box = oldView.$('.lm-container > div')) ||
          !(box = box[0]) ||
          !(obscure = oldView.$('.lf-overlay')) ||
          !(obscure = obscure[0])) {
        return Promise.resolve();
      }

      return Promise.all([
        Velocity.animate(obscure, {opacity: [0, 0.5]}, {duration: 250}),
        Velocity.animate(box, {scale: [0, 1]}, {duration: 250})
      ]);
    }

    function revealModal(insertNewView) {
      return insertNewView().then(function(newView){
        var box, obscure;
        if (!newView ||
            !(box = newView.$('.lm-container > div')[0]) ||
            !(obscure = newView.$('.lf-overlay')[0])) {
          return;
        }

        // we're not going to animate the whole view, rather we're going
        // to animate two pieces of it separately. So we move the view
        // properties down onto the individual elements, so that the
        // animate function can reveal them at precisely the right time.
        Ember.$(box).css({
          display: 'none'
        });

        Ember.$(obscure).css({
          display: 'none'
        });
        newView.$().css({
          display: '',
          visibility: ''
        });

        return Promise.all([
          Velocity.animate(obscure, {opacity: [0.5, 0]}, {duration: 250, display: ''}),
          Velocity.animate(box, {scale: [1, 0]}, {duration: 250, display: ''})
        ]);
      });
    }

    __exports__["default"] = function modalPopup(oldView, insertNewView) {
      return hideModal(oldView).then(function() {
        return revealModal(insertNewView);
      });
    }
  });
define("temp-ember/transitions/move-over", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var stop = __dependency1__.stop;
    var animate = __dependency1__.animate;
    var Promise = __dependency1__.Promise;
    var isAnimating = __dependency1__.isAnimating;
    var finish = __dependency1__.finish;

    __exports__["default"] = function moveOver(oldView, insertNewView, dimension, direction, opts) {
      var oldParams = {},
          newParams = {},
          firstStep,
          property,
          measure;

      if (dimension.toLowerCase() === 'x') {
        property = 'translateX';
        measure = 'width';
      } else {
        property = 'translateY';
        measure = 'height';
      }

      if (isAnimating(oldView, 'moving-in')) {
        firstStep = finish(oldView, 'moving-in');
      } else {
        stop(oldView);
        firstStep = Promise.resolve();
      }


      return firstStep.then(insertNewView).then(function(newView){
        if (newView && newView.$() && oldView && oldView.$()) {
          var sizes = [parseInt(newView.$().css(measure), 10),
                       parseInt(oldView.$().css(measure), 10)];
          var bigger = Math.max.apply(null, sizes);
          oldParams[property] = (bigger * direction) + 'px';
          newParams[property] = ["0px", (-1 * bigger * direction) + 'px'];
        } else {
          oldParams[property] = (100 * direction) + '%';
          newParams[property] = ["0%", (-100 * direction) + '%'];
        }

        return Promise.all([
          animate(oldView, oldParams, opts),
          animate(newView, newParams, opts, 'moving-in')
        ]);
      });
    }
  });
define("temp-ember/transitions/scroll-then", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    __exports__["default"] = function() {
      Ember.assert(
        "You must provide a transition name as the first argument to scrollThen. Example: this.use('scrollThen', 'toLeft')",
        'string' === typeof arguments[2]
      );

      var el = document.getElementsByTagName('html'),
          transitionArgs = Array.prototype.slice.call(arguments, 0, 2),
          nextTransition = this.lookup(arguments[2]),
          self = this,
          options = arguments[3] || {};

      Ember.assert(
        "The second argument to scrollThen is passed to Velocity's scroll function and must be an object",
        'object' === typeof options
      );

      // set scroll options via: this.use('scrollThen', 'ToLeft', {easing: 'spring'})
      options = Ember.merge({duration: 500, offset: 0}, options);

      // additional args can be passed through after the scroll options object
      // like so: this.use('scrollThen', 'moveOver', {duration: 100}, 'x', -1);
      transitionArgs.push.apply(transitionArgs, Array.prototype.slice.call(arguments, 4));

      return window.$.Velocity(el, 'scroll', options).then(function() {
        nextTransition.apply(self, transitionArgs);
      });
    }
  });
define("temp-ember/transitions/to-down", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var curryTransition = __dependency1__.curryTransition;
    __exports__["default"] = curryTransition("move-over", 'y', 1);
  });
define("temp-ember/transitions/to-left", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var curryTransition = __dependency1__.curryTransition;
    __exports__["default"] = curryTransition("move-over", 'x', -1);
  });
define("temp-ember/transitions/to-right", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var curryTransition = __dependency1__.curryTransition;
    __exports__["default"] = curryTransition("move-over", 'x', 1);
  });
define("temp-ember/transitions/to-up", 
  ["liquid-fire","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var curryTransition = __dependency1__.curryTransition;
    __exports__["default"] = curryTransition("move-over", 'y', -1);
  });
define("temp-ember/views/liquid-child", 
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];

    __exports__["default"] = Ember.ContainerView.extend({
      classNames: ['liquid-child'],
      resolveInsertionPromise: Ember.on('didInsertElement', function(){
        // Children start out hidden and invisible.
        // Measurement will `show` them and Velocity will make them visible.
        // This prevents a flash of pre-animated content.
        this.$().css({visibility: 'hidden'}).hide();
        if (this._resolveInsertion) {
          this._resolveInsertion(this);
        }
      })
    });
  });
define("temp-ember/views/liquid-if", 
  ["temp-ember/views/liquid-outlet","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var LiquidOutlet = __dependency1__["default"];
    var Ember = __dependency2__["default"];

    var isHTMLBars = !!Ember.HTMLBars;

    __exports__["default"] = LiquidOutlet.extend({
      liquidUpdate: Ember.on('init', Ember.observer('showFirst', function(){
        var template = this.get('templates')[this.get('showFirst') ? 0 : 1];
        if (!template || !isHTMLBars && template === Ember.Handlebars.VM.noop) {
          this.set('currentView', null);
          return;
        }
        var view = Ember._MetamorphView.create({
          container: this.container,
          template: template,
          liquidParent: this,
          contextBinding: 'liquidParent.context',
          liquidContext: this.get("showFirst"),
          hasLiquidContext: true
        });
        this.set('currentView', view);
      }))

    });
  });
define("temp-ember/views/liquid-outlet", 
  ["ember","liquid-fire","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"];
    var Promise = __dependency2__.Promise;
    var animate = __dependency2__.animate;
    var stop = __dependency2__.stop;
    var capitalize = Ember.String.capitalize;

    __exports__["default"] = Ember.ContainerView.extend({
      classNames: ['liquid-container'],
      growDuration: 250,
      growPixelsPerSecond: 200,
      growEasing: 'slide',
      enableGrowth: true,

      init: function(){
        // The ContainerView constructor normally sticks our "currentView"
        // directly into _childViews, but we want to leave that up to
        // _currentViewDidChange so we have the opportunity to launch a
        // transition.
        this._super();
        Ember.A(this._childViews).clear();

        if (this.get('containerless')) {
          // This prevents Ember from throwing an assertion when we try to
          // render as a virtual view.
          this.set('innerClassNameBindings', this.get('classNameBindings'));
          this.set('classNameBindings', Ember.A());
        }
      },

      // Deliberately overriding a private method from
      // Ember.ContainerView!
      //
      // We need to stop it from destroying our outgoing child view
      // prematurely.
      _currentViewWillChange: Ember.beforeObserver('currentView', function() {}),

      // Deliberately overriding a private method from
      // Ember.ContainerView!
      _currentViewDidChange: Ember.on('init', Ember.observer('currentView', function() {
        // Normally there is only one child (the view we're
        // replacing). But sometimes there may be two children (because a
        // transition is already in progress). In any case, we tell all of
        // them to start heading for the exits now.

        var oldView = this.get('childViews.lastObject'),
            newView = this.get('currentView'),
            firstTime;

        // For the convenience of the transition rules, we explicitly
        // track our first transition, which happens at initial render.
        firstTime = !this._hasTransitioned;
        this._hasTransitioned = true;

        // Idempotence
        if ((!oldView && !newView) ||
            (oldView && oldView.get('currentView') === newView) ||
            (this._runningTransition &&
             this._runningTransition.oldView === oldView &&
             this._runningTransition.newContent === newView
            )) {
          return;
        }

        // `transitions` comes from dependency injection, see the
        // liquid-fire app initializer.
        var transition = this.get('transitions').transitionFor(this, oldView, newView, this.get('use'), firstTime);

        if (this._runningTransition) {
          this._runningTransition.interrupt();
        }

        this._runningTransition = transition;
        transition.run()["catch"](function(err){
          // Force any errors through to the RSVP error handler, because
          // of https://github.com/tildeio/rsvp.js/pull/278.  The fix got
          // into Ember 1.7, so we can drop this once we decide 1.6 is
          // EOL.
          Ember.RSVP.Promise.resolve()._onerror(err);
        });
      })),

      _liquidChildFor: function(content) {
        if (content && !content.get('hasLiquidContext')){
          content.set('liquidContext', content.get('context'));
        }
        var LiquidChild = this.container.lookupFactory('view:liquid-child');
        var childProperties = {
          currentView: content
        };
        if (this.get('containerless')) {
          childProperties.classNames = this.get('classNames').without('liquid-container');
          childProperties.classNameBindings = this.get('innerClassNameBindings');
        }
        return LiquidChild.create(childProperties);
      },

      _pushNewView: function(newView) {
        if (!newView) {
          return Promise.resolve();
        }
        var child = this._liquidChildFor(newView),
            promise = new Promise(function(resolve) {
              child._resolveInsertion = resolve;
            });
        this.pushObject(child);
        return promise;
      },

      cacheSize: function() {
        var elt = this.$();
        if (elt) {
          // Measure original size.
          this._cachedSize = getSize(elt);
        }
      },

      unlockSize: function() {
        var self = this;
        function doUnlock(){
          var elt = self.$();
          if (elt) {
            elt.css({width: '', height: ''});
          }
        }
        if (this._scaling) {
          this._scaling.then(doUnlock);
        } else {
          doUnlock();
        }
      },

      _durationFor: function(before, after) {
        return Math.min(this.get('growDuration'), 1000*Math.abs(before - after)/this.get('growPixelsPerSecond'));
      },

      _adaptDimension: function(dimension, before, after) {
        if (before[dimension] === after[dimension] || !this.get('enableGrowth')) {
          var elt = this.$();
          if (elt) {
            elt[dimension](after[dimension]);
          }
          return Promise.resolve();
        } else {
          // Velocity deals in literal width/height, whereas jQuery deals
          // in box-sizing-dependent measurements.
          var target = {};
          target[dimension] = [
            after['literal'+capitalize(dimension)],
            before['literal'+capitalize(dimension)],
          ];
          return animate(this, target, {
            duration: this._durationFor(before[dimension], after[dimension]),
            queue: false,
            easing: this.get('growEasing')
          });
        }
      },

      adaptSize: function() {
        stop(this);

        var elt = this.$();
        if (!elt) { return; }

        // Measure new size.
        var newSize = getSize(elt);
        if (typeof(this._cachedSize) === 'undefined') {
          this._cachedSize = newSize;
        }

        // Now that measurements have been taken, lock the size
        // before the invoking the scaling transition.
        elt.width(this._cachedSize.width);
        elt.height(this._cachedSize.height);

        this._scaling = Promise.all([
          this._adaptDimension('width', this._cachedSize, newSize),
          this._adaptDimension('height', this._cachedSize, newSize),
        ]);
      }

    });

    // We're tracking both jQuery's box-sizing dependent measurements and
    // the literal CSS properties, because it's nice to get/set dimensions
    // with jQuery and not worry about boz-sizing *but* Velocity needs the
    // raw values.
    function getSize(elt) {
      return {
        width: elt.width(),
        literalWidth: parseInt(elt.css('width'),10),
        height: elt.height(),
        literalHeight: parseInt(elt.css('height'),10)
      };
    }
  });
define("temp-ember/views/liquid-with", 
  ["temp-ember/views/liquid-outlet","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var LiquidOutlet = __dependency1__["default"];
    var Ember = __dependency2__["default"];

    __exports__["default"] = LiquidOutlet.extend({
      liquidUpdate: Ember.on('init', Ember.observer('boundContext', function(){
        var context = this.get('boundContext');
        if (Ember.isEmpty(context)) {
          this.set('currentView', null);
          return;
        }
        var view = Ember._MetamorphView.create({
          container: this.container,
          templateName: 'liquid-with',
          boundContext: context,
          liquidWithParent: this,
          liquidContext: context,
          hasLiquidContext: true,
        });
        this.set('currentView', view);
      }))

    });
  });
/* jshint ignore:start */

define('temp-ember/config/environment', ['ember'], function(Ember) {
  var prefix = 'temp-ember';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = Ember['default'].$('meta[name="' + metaName + '"]').attr('content');
  var config = JSON.parse(unescape(rawConfig));

  return { 'default': config };
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

if (runningTests) {
  require("temp-ember/tests/test-helper");
} else {
  require("temp-ember/app")["default"].create({"LOG_ACTIVE_GENERATION":true,"LOG_VIEW_LOOKUPS":true});
}

/* jshint ignore:end */
//# sourceMappingURL=temp-ember.map