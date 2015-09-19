var lf = require('lovefield');
var sqlSelectParser = require('polylove-sql-parser');
var lfDatabase;

var lfReadyCallbacks = [];
function lfReady(cb) {
  lfReadyCallbacks.push(cb);
}

function lfQueryBuilder (db, options) {
  this.db = db;
  this.alias = {};
  this.options = options;

  this.propertyBindingIndexies = {};
  this.constants = options.constants;
}

lfQueryBuilder.prototype.table = function(n) {
  var t;
  if(typeof n == 'string') {
    if (!this.alias[n]) { 
      this.alias[n] = this.db.getSchema().table(n);
    }
    return this.alias[n];
  }

  if (Array.isArray(n)) {
    if (!this.alias[n[1]]) {
      this.alias[n[1]] = this.db.getSchema().table(n[0]);
    }
    return this.alias[n[1]];
  }

  throw 'Invalid table name';      
};

lfQueryBuilder.prototype.build = function() {
  var q, db = this.db;

  var queryObject = this.options.query;

  var tables = {};

  // SELECT
  if (queryObject.columns.length === 1 && queryObject.columns[0] === '*'){
    q = db.select();
  } else {
    throw 'TODO';
  }

  // FROM
  var fromArguments = []
  queryObject.from.forEach(function (from) {
    fromArguments.push(this.table(from))
  }, this);
  q.from.apply(q, fromArguments);

  // WHERE
  if (Array.isArray(queryObject.where)) {
    q.where(this.buildWhere(queryObject.where));
  }

  // ORDER BY
  if (Array.isArray(queryObject.orderBy)) {
    queryObject.orderBy.forEach(function (o) {
      var d;

      if (o[2] == 'DESC') {
        d = lf.Order.DESC;
      } else if (o[2] == 'ASC') {
        d = lf.Order.ASC;
      }
      q.orderBy(this.table(o[0])[o[1]], d);
    }, this);
  }
  return q;
};

lfQueryBuilder.prototype.bind = function (value) {
  if (value.type == 'property') {
    if (!this.propertyBindingIndexies[value.name]) {
      this.propertyBindingIndexies[value.name] = Object.keys(this.propertyBindingIndexies).length;
    }
    return this.propertyBindingIndexies[value.name];
    
  }
  throw 'TODO';
};

lfQueryBuilder.prototype.buildWhere = function (w) {
  var me = this;

  switch(w[0]) {
    // A = B
    case '=': return (function () {
      var a, b;

      a = me.table(w[1][0])[w[1][1]];
      // ['=', ['table', 'a'], {type: 'property', name: 'b', index: 0}]
      if (w[2].type === 'property') {
        b = lf.bind(me.bind(w[2]));
      // ['=', ['table', 'a'], {type: 'constant', name: 'b', index: 0}]
      } else if (w[2].type === 'constant') {
        b = this.constants[w[2].name];
      } else {
        throw 'Error';
      }
      
      return a.eq(b);
    })();
  }
};

function lfBuildQuery(db, options) {
  return (new lfQueryBuilder(db, options)).build();
}

function lfParseSQLSelect(queryString, constants) {
  return function (db) { return lfBuildQuery(db, this); }.bind({
    constants: constants,
    query: sqlSelectParser.parse(queryString)
  });
}

function lfBehaviorBuilder() {
  this.behavior = {
    observers: [],
    properties: {}
  };
}

lfBehaviorBuilder.prototype.push = function(propertyName, queryString, constants) {
  constants = constants || {};

  var query = null;
  var queue = [];
  var createQuery = lfParseSQLSelect(queryString, constants);

  this.behavior.properties[propertyName] = {
    type: Array,
    value: [],
    notify: true
  };

  this.behavior.observers.push('_'+propertyName+'Observer(year)');

  lfReady(function (db) {

    query = createQuery(db)
    
    var task;
    while (task = queue.shift()){
      runQuery.apply(null, task);
    }
  });

  function runQuery(el, binds) {
    if (!query) {
      queue.push([el, binds]);
      return;
    }
    query.bind(binds).exec().then(function (rows) {
      el.notifyPath(propertyName, rows);
    });
  }

  this.behavior['_'+propertyName+'Observer'] = function (year) {
    runQuery(this, [year]);
  }; 
};


function lfBehavior(options) {
  var builder = new lfBehaviorBuilder();

  Object.keys(options).forEach(function (propertyName) {
    if (typeof options[propertyName] == 'string') {
      builder.push(propertyName, options[propertyName]);
    } else {
      builder.push(propertyName, options[propertyName].query, options[propertyName].constants);
    }    
  });

  return builder.behavior;
}


/*
(function (db) {
  var t = db.getSchema().table('Movie');

  var rows = [];

  rows.push(t.createRow({
    'id': 666,
    'title': 'Diablo',
    'year': 2014,
  }));
  db.insertOrReplace().into(t).values(rows).exec().then(function () {
    console.log('DONE !');
  });

})(lfDatabase);
*/

function lfConnect (schemaBuilder) {
  return schemaBuilder.connect()
  .then(function (database) {
    return lfDatabase = database;
  })
}

module.exports = {
  lf: lf,
  ready: function (db) {
    lfReadyCallbacks.forEach(function (cb) {
      cb.call(null, db);
    });
  },
  connect: lfConnect,
  behavior: lfBehavior,
  getErrorMessage: function (error) {
    var error_code = require('json!./node_modules/lovefield/dist/error_code.json');
    var parts = url.parse(error.message, true);
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
