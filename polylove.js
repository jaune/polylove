var lf = require('lovefield');
var lfDatabase;

var lfBehaviorBuilder = require('./lib/BehaviorBuilder.js');
var QueryManager = require('./lib/QueryManager.js');

var qm = new QueryManager();

function lfBehavior(options) {
  var builder = new lfBehaviorBuilder(qm);

  Object.keys(options).forEach(function (propertyName) {
    if (typeof options[propertyName] == 'string') {
      builder.push(propertyName, options[propertyName]);
    } else {
      builder.push(propertyName, options[propertyName].query, options[propertyName].constants);
    }    
  });

  return builder.behavior;
}

module.exports = {
  lf: lf,
  qm: qm,
  ready: function (db) {
    qm.setDatabase(db);
  },
  behavior: lfBehavior,
  getErrorMessage: function (error) {
    var error_code = require('json!./node_modules/lovefield/dist/error_code.json');
    var parts = require('url').parse(error.message, true);
    var message = error_code[error.code];

    Object.keys(parts.query).forEach(function (param) {
      var matches = param.match(/([0-9]+)$/);
      if (matches) {
        message = message.replace('{'+matches[1]+'}', parts.query[param]);
      }
    }); 

    return error.code+': '+message;
  }
};
