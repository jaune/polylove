function lfBehaviorBuilder(queryManager) {
  this.queryManager = queryManager;

  this.behavior = {
    observers: [],
    properties: {}
  };
}

lfBehaviorBuilder.prototype.push = function(propertyName, queryString, constants) {
  constants = constants || {};

  var query = queryManager.createQuery(queryString, constants);

  this.behavior.properties[propertyName] = {
    type: Array,
    value: [],
    notify: true
  };  

  this.behavior.observers.push('_'+propertyName+'Observer('+query.parameterNames.join(', ')+')');

  this.behavior['_'+propertyName+'Observer'] = function () {
    var me = this;
    query.run(Array.prototype.slice.call(arguments, 0), function (error, rows) {
      me.notifyPath(propertyName, rows);
    });
  }; 
};


module.exports = lfBehaviorBuilder;