var sqlSelectParse = require('polylove-sql-parser');

var QueryBuilder = require('./QueryBuilder.js');


function lfBuildQuery(db, options) {
  return (new lfQueryBuilder(db, options)).build();
}

function lfParseSQLSelect(queryObject, constants) {
  return function (db) { return lfBuildQuery(db, this); }.bind({
    constants: constants,
    query: queryObject
  });
}

var Query = function (db) {
  this.db = db;
	this.parameterNames = [];
  this.constantValues = {};
  this.queryObject = null;
};

Query.prototype.run = function(propertyValues, next) {
  if (!this.db) {
    return;
  }

  var builder = new QueryBuilder(this.db, this.queryObject, propertyValues, this.constantValues);

  builder.build().exec()
  .then(function(rows) {
    next(null, rows);
  })
  .catch(function (error) {
    next(error);
  });
};

Query.prototype.setDatabase = function(db) {
  this.db = db;
};

var QueryManager = function () {
  this.queries = [];
  this.db = null;
};

QueryManager.prototype.setDatabase = function (db) {
  this.db = db;

  this.queries.forEach(function (query) {
    query.setDatabase(db);
  });
};

QueryManager.prototype.create = function (queryString, constantValues) {
  var q = new Query(this.db);

  var queryObject = sqlSelectParse(queryString)
  var createQuery = lfParseSQLSelect(queryObject, constantValues);

  q.queryObject = queryObject;
  q.constantValues = constantValues;
  q.parameterNames  = queryObject.properties;

  this.queries.push(q);

  return q;
};

module.exports = QueryManager;