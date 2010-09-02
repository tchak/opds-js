// underscore.class.js
// (c) 2010 Paul Chavard
// underscore.class is freely distributable under the terms of the MIT license.
// Portions of underscore.class are inspired by or borrowed from RightJS and Prototype.js.
// For all details and documentation:
// http://tchak.github.com/underscore.class

(function(){
  var root = this,
      disableConstructor = false;

  var COMMONS = ['extended', 'included', 'inherited'],
      EXTEND  = COMMONS.concat(['prototype', 'superclass', 'extend', 'include']),
      INCLUDE = COMMONS.concat(['constructor']);
  
  /* instanciate a class without calling the constructor */
  function cheapNew(classObject){
    disableConstructor = true;
    var classInstance = new classObject;
    disableConstructor = false;
    return classInstance;
  }

  /* clean module */
  function cloneWithout(){
    var filter = _.toArray(arguments), object = filter.shift(), copy = {}, key;
    for (key in object){
      if (!_.include(filter, key)){
        copy[key] = object[key];
      }
    }
    return copy;
  }

  function cleanModule(module, what){
    return cloneWithout.apply(module, [module].concat(what == 'e' ? EXTEND : INCLUDE));
  }
  
  function descendents(classObject){
    return _.reduce(classObject.__class__.children, function(descs, descendent){
      return descs.concat(descendents(descendent));
    }, [classObject]);
  }
  
  function populateClass(classObject, className){
    classObject.__class__ = {
      extentions: [],
      children: [],
      ancestors: []
    }
  }

  // Class implementation
  var Class = function(){
    var args = _.toArray(arguments), properties = args.pop() || {}, SuperClass = args.pop();

    // basic class object definition
    function BaseClass(){
      if (disableConstructor){
        return;
      }
      var properThis = root === this ? cheapNew(arguments.callee) : this;
      // Initialize
      if (properThis.initialize){
        properThis.initialize.apply(properThis, arguments);
      }
      return properThis;
    };

    populateClass(BaseClass);

    // if only the super class has been specified
    if (!args.length && !_.isHash(properties)) {
      SuperClass = properties; properties = {};
    }

    // attaching main class-level methods
    _.extend(BaseClass, Class.Methods).inherit(SuperClass);

    // catching the injections
    _.each(['extend', 'include'], function(name) {
      if (properties[name]) {
        var modules = properties[name];
        modules = _.isArray(modules) ? modules : [modules];
        BaseClass[name].apply(BaseClass, modules);
        delete(properties[name]);
      }
    });

    return BaseClass.include(properties);
  };

  Class.Methods = {
    // Makes the class get inherited from another one
    inherit: function(SuperClass) {
      // handling the superclass class assign
      if (SuperClass && SuperClass.prototype) {
        var SubClass = function(){};
        SubClass.prototype = SuperClass.prototype;
        this.prototype = new SubClass;
        this.superclass = SuperClass;
        
        // Register new class as child
        SuperClass.__class__.children.push(this);
      }

      // collecting the list of ancestors
      while (SuperClass) {
        this.__class__.ancestors.push(SuperClass);
        SuperClass = SuperClass.superclass;
      }
      SuperClass = this.__class__.ancestors[0];

      this.prototype.constructor = this;

      // copy class extentions from the superclass
      _.each(this.__class__.ancestors.reverse(), function(ancestor){
        this.extend.apply(this, ancestor.__class__.extentions);
      }, this);

      if (SuperClass && _.isFunction(SuperClass.inherited)){
        SuperClass.inherited.apply(SuperClass, [this]);
      }

      return this;
    },

    // This method will extend the class-level with the given objects
    extend: function() {
      var extentions = _.reduce(this.__class__.ancestors, function(extentions, ancestor){
            return extentions.concat(ancestor.__class__.extentions);
          }, this.__class__.extentions);
      _(arguments).chain().filter(_.isHash).each(function(module){
        var callback = module.extended;
        module = cleanModule(module, 'e');
        var moduleExist = _.any(extentions, function(ext){
          return _.isEqual(ext, module);
        });
        if (!moduleExist){
          this.__class__.extentions.push(module);
        }
        _.each(descendents(this), function(descendent){
          _.extend(descendent, module);
        });
        if (callback){
          callback.call(module, this);
        }
      }, this);

      return this;
    },

    // Extends the class prototype with the given objects
    include: function() {
      var ancestors = _.pluck(this.__class__.ancestors, 'prototype');

      _(arguments).chain().filter(_.isHash).each(function(module){
        var callback = module.included;
        module = cleanModule(module, 'i');
        for (var key in module) {
          var ancestor = _.detect(ancestors, function(proto){
            return key in proto && _.isFunction(proto[key]);
          });
          this.prototype[key] = !ancestor ? module[key] :
            (function(name, method, superMethod) {
              return function() {
                this.__super__ = superMethod;
                return method.apply(this, arguments);
              };
            })(key, module[key], ancestor[key]);
        }

        if (callback){
          callback.call(module, this);
        }
      }, this);

      return this;
    }
  };

  // expose underscore functions
  _.mixin({
    isHash: function(obj){
      return Object.prototype.toString.call(obj) === '[object Object]';
    },
    isClass: function(obj){
      return obj && obj.__class__;
    },
    Class: function(){
      return Class.apply(this, arguments);
    },
    callSuper: function(){
      var args = _.toArray(arguments), context = args.shift();
      if (context && _.isFunction(context.__super__)){
        return context.__super__.apply(context, args);
      } else {
        throw new Error("No super method defined!");
      }
    }
  });
})();
