
function lfQueryBuilder (db, queryObject, propertyValues, constantValues) {
  this.db = db;
  this.alias = {};
  this.queryObject = queryObject;

  this.constantValues = constantValues;
  this.propertyValues = propertyValues;
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

  var queryObject = this.queryObject;

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

      if (typeof o[2] == 'string') {
        d = lf.Order[o[2].toUpperCase()];
      } else if (typeof o[2] == 'object') {
        switch (o[2].type) {
          case 'constant':
            d = lf.Order[this.constantValues[o[2].name].toUpperCase()];
          break;
          case 'property':
            d = this.propertyValues[o[2].name];
          break;
          default:
            throw 'Unsupported binding direction !'
        }
      }
      else {
        throw 'Invalid direction !'
      }
      q.orderBy(this.table(o[0])[o[1]], d);
    }, this);
  }
  return q;
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
        b = me.propertyValues[w[2].name];
      // ['=', ['table', 'a'], {type: 'constant', name: 'b', index: 0}]
      } else if (w[2].type === 'constant') {
        b = me.constantValues[w[2].name];
      } else {
        throw 'Error';
      }

      return a.eq(b);
    })();
  }
};

module.exports = lfQueryBuilder;