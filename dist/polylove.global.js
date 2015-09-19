/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	if (!window.polylove) {
	  window.polylove = __webpack_require__(1);
	}

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var lf = __webpack_require__(2);
	var sqlSelectParser = __webpack_require__(3);
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
	    var error_code = __webpack_require__(4);
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


/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = lf;

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = (function() {
	  "use strict";
	
	  /*
	   * Generated by PEG.js 0.9.0.
	   *
	   * http://pegjs.org/
	   */
	
	  function peg$subclass(child, parent) {
	    function ctor() { this.constructor = child; }
	    ctor.prototype = parent.prototype;
	    child.prototype = new ctor();
	  }
	
	  function peg$SyntaxError(message, expected, found, location) {
	    this.message  = message;
	    this.expected = expected;
	    this.found    = found;
	    this.location = location;
	    this.name     = "SyntaxError";
	
	    if (typeof Error.captureStackTrace === "function") {
	      Error.captureStackTrace(this, peg$SyntaxError);
	    }
	  }
	
	  peg$subclass(peg$SyntaxError, Error);
	
	  function peg$parse(input) {
	    var options = arguments.length > 1 ? arguments[1] : {},
	        parser  = this,
	
	        peg$FAILED = {},
	
	        peg$startRuleFunctions = { Start: peg$parseStart },
	        peg$startRuleFunction  = peg$parseStart,
	
	        peg$c0 = "SELECT",
	        peg$c1 = { type: "literal", value: "SELECT", description: "\"SELECT\"" },
	        peg$c2 = "FROM",
	        peg$c3 = { type: "literal", value: "FROM", description: "\"FROM\"" },
	        peg$c4 = "WHERE",
	        peg$c5 = { type: "literal", value: "WHERE", description: "\"WHERE\"" },
	        peg$c6 = "ORDER",
	        peg$c7 = { type: "literal", value: "ORDER", description: "\"ORDER\"" },
	        peg$c8 = "BY",
	        peg$c9 = { type: "literal", value: "BY", description: "\"BY\"" },
	        peg$c10 = function(columns, from, where, orderBy) { return { columns: columns, from: from, where: where, orderBy: orderBy }; },
	        peg$c11 = function(columns, from, where) { return { columns: columns, from: from, where: where, orderBy: [] }; },
	        peg$c12 = function(columns, from) { return { columns: columns, from: from, where: [], orderBy: [] }; },
	        peg$c13 = ",",
	        peg$c14 = { type: "literal", value: ",", description: "\",\"" },
	        peg$c15 = function(begin, end) { return [begin].concat(end); },
	        peg$c16 = function(e) { return [e]; },
	        peg$c17 = function(name, d) { return name.concat([d]); },
	        peg$c18 = "DESC",
	        peg$c19 = { type: "literal", value: "DESC", description: "\"DESC\"" },
	        peg$c20 = "ASC",
	        peg$c21 = { type: "literal", value: "ASC", description: "\"ASC\"" },
	        peg$c22 = "AND",
	        peg$c23 = { type: "literal", value: "AND", description: "\"AND\"" },
	        peg$c24 = function(a, b) { return ['and', a, b]; },
	        peg$c25 = "OR",
	        peg$c26 = { type: "literal", value: "OR", description: "\"OR\"" },
	        peg$c27 = function(a, b) { return ['or', a, b]; },
	        peg$c28 = "=",
	        peg$c29 = { type: "literal", value: "=", description: "\"=\"" },
	        peg$c30 = function(name, value) { return ['=', name, value]; },
	        peg$c31 = function(value, name) { return ['=', name, value]; },
	        peg$c32 = "{{",
	        peg$c33 = { type: "literal", value: "{{", description: "\"{{\"" },
	        peg$c34 = "}}",
	        peg$c35 = { type: "literal", value: "}}", description: "\"}}\"" },
	        peg$c36 = function(name) { return { type: 'property', name: name }; },
	        peg$c37 = ":",
	        peg$c38 = { type: "literal", value: ":", description: "\":\"" },
	        peg$c39 = function(name) { return { type: 'constant', name: name }; },
	        peg$c40 = { type: "other", description: "columns" },
	        peg$c41 = "*",
	        peg$c42 = { type: "literal", value: "*", description: "\"*\"" },
	        peg$c43 = function() {return ['*']},
	        peg$c44 = "AS",
	        peg$c45 = { type: "literal", value: "AS", description: "\"AS\"" },
	        peg$c46 = ".",
	        peg$c47 = { type: "literal", value: ".", description: "\".\"" },
	        peg$c48 = function(name) { return [name]; },
	        peg$c49 = function(name, alias) { return [name, alias]; },
	        peg$c50 = function(name) { return [name, name]; },
	        peg$c51 = /^[a-zA-z_]/,
	        peg$c52 = { type: "class", value: "[a-zA-z_]", description: "[a-zA-z_]" },
	        peg$c53 = /^[a-zA-Z0-9_]/,
	        peg$c54 = { type: "class", value: "[a-zA-Z0-9_]", description: "[a-zA-Z0-9_]" },
	        peg$c55 = function(begin, end) { return begin + end.join(''); },
	        peg$c56 = " ",
	        peg$c57 = { type: "literal", value: " ", description: "\" \"" },
	        peg$c58 = "\n",
	        peg$c59 = { type: "literal", value: "\n", description: "\"\\n\"" },
	        peg$c60 = "\r",
	        peg$c61 = { type: "literal", value: "\r", description: "\"\\r\"" },
	        peg$c62 = "\t",
	        peg$c63 = { type: "literal", value: "\t", description: "\"\\t\"" },
	        peg$c64 = { type: "other", description: "whitespaces" },
	        peg$c65 = function() { return null; },
	
	        peg$currPos          = 0,
	        peg$savedPos         = 0,
	        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
	        peg$maxFailPos       = 0,
	        peg$maxFailExpected  = [],
	        peg$silentFails      = 0,
	
	        peg$result;
	
	    if ("startRule" in options) {
	      if (!(options.startRule in peg$startRuleFunctions)) {
	        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
	      }
	
	      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
	    }
	
	    function text() {
	      return input.substring(peg$savedPos, peg$currPos);
	    }
	
	    function location() {
	      return peg$computeLocation(peg$savedPos, peg$currPos);
	    }
	
	    function expected(description) {
	      throw peg$buildException(
	        null,
	        [{ type: "other", description: description }],
	        input.substring(peg$savedPos, peg$currPos),
	        peg$computeLocation(peg$savedPos, peg$currPos)
	      );
	    }
	
	    function error(message) {
	      throw peg$buildException(
	        message,
	        null,
	        input.substring(peg$savedPos, peg$currPos),
	        peg$computeLocation(peg$savedPos, peg$currPos)
	      );
	    }
	
	    function peg$computePosDetails(pos) {
	      var details = peg$posDetailsCache[pos],
	          p, ch;
	
	      if (details) {
	        return details;
	      } else {
	        p = pos - 1;
	        while (!peg$posDetailsCache[p]) {
	          p--;
	        }
	
	        details = peg$posDetailsCache[p];
	        details = {
	          line:   details.line,
	          column: details.column,
	          seenCR: details.seenCR
	        };
	
	        while (p < pos) {
	          ch = input.charAt(p);
	          if (ch === "\n") {
	            if (!details.seenCR) { details.line++; }
	            details.column = 1;
	            details.seenCR = false;
	          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
	            details.line++;
	            details.column = 1;
	            details.seenCR = true;
	          } else {
	            details.column++;
	            details.seenCR = false;
	          }
	
	          p++;
	        }
	
	        peg$posDetailsCache[pos] = details;
	        return details;
	      }
	    }
	
	    function peg$computeLocation(startPos, endPos) {
	      var startPosDetails = peg$computePosDetails(startPos),
	          endPosDetails   = peg$computePosDetails(endPos);
	
	      return {
	        start: {
	          offset: startPos,
	          line:   startPosDetails.line,
	          column: startPosDetails.column
	        },
	        end: {
	          offset: endPos,
	          line:   endPosDetails.line,
	          column: endPosDetails.column
	        }
	      };
	    }
	
	    function peg$fail(expected) {
	      if (peg$currPos < peg$maxFailPos) { return; }
	
	      if (peg$currPos > peg$maxFailPos) {
	        peg$maxFailPos = peg$currPos;
	        peg$maxFailExpected = [];
	      }
	
	      peg$maxFailExpected.push(expected);
	    }
	
	    function peg$buildException(message, expected, found, location) {
	      function cleanupExpected(expected) {
	        var i = 1;
	
	        expected.sort(function(a, b) {
	          if (a.description < b.description) {
	            return -1;
	          } else if (a.description > b.description) {
	            return 1;
	          } else {
	            return 0;
	          }
	        });
	
	        while (i < expected.length) {
	          if (expected[i - 1] === expected[i]) {
	            expected.splice(i, 1);
	          } else {
	            i++;
	          }
	        }
	      }
	
	      function buildMessage(expected, found) {
	        function stringEscape(s) {
	          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
	
	          return s
	            .replace(/\\/g,   '\\\\')
	            .replace(/"/g,    '\\"')
	            .replace(/\x08/g, '\\b')
	            .replace(/\t/g,   '\\t')
	            .replace(/\n/g,   '\\n')
	            .replace(/\f/g,   '\\f')
	            .replace(/\r/g,   '\\r')
	            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
	            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
	            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
	            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
	        }
	
	        var expectedDescs = new Array(expected.length),
	            expectedDesc, foundDesc, i;
	
	        for (i = 0; i < expected.length; i++) {
	          expectedDescs[i] = expected[i].description;
	        }
	
	        expectedDesc = expected.length > 1
	          ? expectedDescs.slice(0, -1).join(", ")
	              + " or "
	              + expectedDescs[expected.length - 1]
	          : expectedDescs[0];
	
	        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
	
	        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
	      }
	
	      if (expected !== null) {
	        cleanupExpected(expected);
	      }
	
	      return new peg$SyntaxError(
	        message !== null ? message : buildMessage(expected, found),
	        expected,
	        found,
	        location
	      );
	    }
	
	    function peg$parseStart() {
	      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17;
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 6) === peg$c0) {
	        s1 = peg$c0;
	        peg$currPos += 6;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c1); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parseColumns();
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 !== peg$FAILED) {
	              if (input.substr(peg$currPos, 4) === peg$c2) {
	                s5 = peg$c2;
	                peg$currPos += 4;
	              } else {
	                s5 = peg$FAILED;
	                if (peg$silentFails === 0) { peg$fail(peg$c3); }
	              }
	              if (s5 !== peg$FAILED) {
	                s6 = peg$parse_();
	                if (s6 !== peg$FAILED) {
	                  s7 = peg$parseFrom();
	                  if (s7 !== peg$FAILED) {
	                    s8 = peg$parse_();
	                    if (s8 !== peg$FAILED) {
	                      if (input.substr(peg$currPos, 5) === peg$c4) {
	                        s9 = peg$c4;
	                        peg$currPos += 5;
	                      } else {
	                        s9 = peg$FAILED;
	                        if (peg$silentFails === 0) { peg$fail(peg$c5); }
	                      }
	                      if (s9 !== peg$FAILED) {
	                        s10 = peg$parse_();
	                        if (s10 !== peg$FAILED) {
	                          s11 = peg$parseWhereExpression();
	                          if (s11 !== peg$FAILED) {
	                            s12 = peg$parse_();
	                            if (s12 !== peg$FAILED) {
	                              if (input.substr(peg$currPos, 5) === peg$c6) {
	                                s13 = peg$c6;
	                                peg$currPos += 5;
	                              } else {
	                                s13 = peg$FAILED;
	                                if (peg$silentFails === 0) { peg$fail(peg$c7); }
	                              }
	                              if (s13 !== peg$FAILED) {
	                                s14 = peg$parse_();
	                                if (s14 !== peg$FAILED) {
	                                  if (input.substr(peg$currPos, 2) === peg$c8) {
	                                    s15 = peg$c8;
	                                    peg$currPos += 2;
	                                  } else {
	                                    s15 = peg$FAILED;
	                                    if (peg$silentFails === 0) { peg$fail(peg$c9); }
	                                  }
	                                  if (s15 !== peg$FAILED) {
	                                    s16 = peg$parse_();
	                                    if (s16 !== peg$FAILED) {
	                                      s17 = peg$parseOrderByExpression();
	                                      if (s17 !== peg$FAILED) {
	                                        peg$savedPos = s0;
	                                        s1 = peg$c10(s3, s7, s11, s17);
	                                        s0 = s1;
	                                      } else {
	                                        peg$currPos = s0;
	                                        s0 = peg$FAILED;
	                                      }
	                                    } else {
	                                      peg$currPos = s0;
	                                      s0 = peg$FAILED;
	                                    }
	                                  } else {
	                                    peg$currPos = s0;
	                                    s0 = peg$FAILED;
	                                  }
	                                } else {
	                                  peg$currPos = s0;
	                                  s0 = peg$FAILED;
	                                }
	                              } else {
	                                peg$currPos = s0;
	                                s0 = peg$FAILED;
	                              }
	                            } else {
	                              peg$currPos = s0;
	                              s0 = peg$FAILED;
	                            }
	                          } else {
	                            peg$currPos = s0;
	                            s0 = peg$FAILED;
	                          }
	                        } else {
	                          peg$currPos = s0;
	                          s0 = peg$FAILED;
	                        }
	                      } else {
	                        peg$currPos = s0;
	                        s0 = peg$FAILED;
	                      }
	                    } else {
	                      peg$currPos = s0;
	                      s0 = peg$FAILED;
	                    }
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$FAILED;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$FAILED;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.substr(peg$currPos, 6) === peg$c0) {
	          s1 = peg$c0;
	          peg$currPos += 6;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c1); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parse_();
	          if (s2 !== peg$FAILED) {
	            s3 = peg$parseColumns();
	            if (s3 !== peg$FAILED) {
	              s4 = peg$parse_();
	              if (s4 !== peg$FAILED) {
	                if (input.substr(peg$currPos, 4) === peg$c2) {
	                  s5 = peg$c2;
	                  peg$currPos += 4;
	                } else {
	                  s5 = peg$FAILED;
	                  if (peg$silentFails === 0) { peg$fail(peg$c3); }
	                }
	                if (s5 !== peg$FAILED) {
	                  s6 = peg$parse_();
	                  if (s6 !== peg$FAILED) {
	                    s7 = peg$parseFrom();
	                    if (s7 !== peg$FAILED) {
	                      s8 = peg$parse_();
	                      if (s8 !== peg$FAILED) {
	                        if (input.substr(peg$currPos, 5) === peg$c4) {
	                          s9 = peg$c4;
	                          peg$currPos += 5;
	                        } else {
	                          s9 = peg$FAILED;
	                          if (peg$silentFails === 0) { peg$fail(peg$c5); }
	                        }
	                        if (s9 !== peg$FAILED) {
	                          s10 = peg$parse_();
	                          if (s10 !== peg$FAILED) {
	                            s11 = peg$parseWhereExpression();
	                            if (s11 !== peg$FAILED) {
	                              peg$savedPos = s0;
	                              s1 = peg$c11(s3, s7, s11);
	                              s0 = s1;
	                            } else {
	                              peg$currPos = s0;
	                              s0 = peg$FAILED;
	                            }
	                          } else {
	                            peg$currPos = s0;
	                            s0 = peg$FAILED;
	                          }
	                        } else {
	                          peg$currPos = s0;
	                          s0 = peg$FAILED;
	                        }
	                      } else {
	                        peg$currPos = s0;
	                        s0 = peg$FAILED;
	                      }
	                    } else {
	                      peg$currPos = s0;
	                      s0 = peg$FAILED;
	                    }
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$FAILED;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$FAILED;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.substr(peg$currPos, 6) === peg$c0) {
	            s1 = peg$c0;
	            peg$currPos += 6;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c1); }
	          }
	          if (s1 !== peg$FAILED) {
	            s2 = peg$parse_();
	            if (s2 !== peg$FAILED) {
	              s3 = peg$parseColumns();
	              if (s3 !== peg$FAILED) {
	                s4 = peg$parse_();
	                if (s4 !== peg$FAILED) {
	                  if (input.substr(peg$currPos, 4) === peg$c2) {
	                    s5 = peg$c2;
	                    peg$currPos += 4;
	                  } else {
	                    s5 = peg$FAILED;
	                    if (peg$silentFails === 0) { peg$fail(peg$c3); }
	                  }
	                  if (s5 !== peg$FAILED) {
	                    s6 = peg$parse_();
	                    if (s6 !== peg$FAILED) {
	                      s7 = peg$parseFrom();
	                      if (s7 !== peg$FAILED) {
	                        peg$savedPos = s0;
	                        s1 = peg$c12(s3, s7);
	                        s0 = s1;
	                      } else {
	                        peg$currPos = s0;
	                        s0 = peg$FAILED;
	                      }
	                    } else {
	                      peg$currPos = s0;
	                      s0 = peg$FAILED;
	                    }
	                  } else {
	                    peg$currPos = s0;
	                    s0 = peg$FAILED;
	                  }
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$FAILED;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseOrderByExpression() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseOrderByColumn();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 === peg$FAILED) {
	          s2 = null;
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 44) {
	            s3 = peg$c13;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c14); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 === peg$FAILED) {
	              s4 = null;
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseOrderByExpression();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c15(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseOrderByColumn();
	        if (s1 !== peg$FAILED) {
	          peg$savedPos = s0;
	          s1 = peg$c16(s1);
	        }
	        s0 = s1;
	      }
	
	      return s0;
	    }
	
	    function peg$parseOrderByColumn() {
	      var s0, s1, s2, s3;
	
	      s0 = peg$currPos;
	      s1 = peg$parseColumnName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 !== peg$FAILED) {
	          s3 = peg$parseOrderByDirection();
	          if (s3 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c17(s1, s3);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseColumnName();
	      }
	
	      return s0;
	    }
	
	    function peg$parseOrderByDirection() {
	      var s0;
	
	      if (input.substr(peg$currPos, 4) === peg$c18) {
	        s0 = peg$c18;
	        peg$currPos += 4;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c19); }
	      }
	      if (s0 === peg$FAILED) {
	        if (input.substr(peg$currPos, 3) === peg$c20) {
	          s0 = peg$c20;
	          peg$currPos += 3;
	        } else {
	          s0 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c21); }
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseWhereExpression() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseWhereExpressionColumn();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 !== peg$FAILED) {
	          if (input.substr(peg$currPos, 3) === peg$c22) {
	            s3 = peg$c22;
	            peg$currPos += 3;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c23); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseWhereExpression();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c24(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseWhereExpressionColumn();
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parse_();
	          if (s2 !== peg$FAILED) {
	            if (input.substr(peg$currPos, 2) === peg$c25) {
	              s3 = peg$c25;
	              peg$currPos += 2;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c26); }
	            }
	            if (s3 !== peg$FAILED) {
	              s4 = peg$parse_();
	              if (s4 !== peg$FAILED) {
	                s5 = peg$parseWhereExpression();
	                if (s5 !== peg$FAILED) {
	                  peg$savedPos = s0;
	                  s1 = peg$c27(s1, s5);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$FAILED;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$parseWhereExpressionColumn();
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseWhereExpressionColumn() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseColumnName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 === peg$FAILED) {
	          s2 = null;
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 61) {
	            s3 = peg$c28;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c29); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 === peg$FAILED) {
	              s4 = null;
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseValue();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c30(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseValue();
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parse_();
	          if (s2 === peg$FAILED) {
	            s2 = null;
	          }
	          if (s2 !== peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 61) {
	              s3 = peg$c28;
	              peg$currPos++;
	            } else {
	              s3 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c29); }
	            }
	            if (s3 !== peg$FAILED) {
	              s4 = peg$parse_();
	              if (s4 === peg$FAILED) {
	                s4 = null;
	              }
	              if (s4 !== peg$FAILED) {
	                s5 = peg$parseColumnName();
	                if (s5 !== peg$FAILED) {
	                  peg$savedPos = s0;
	                  s1 = peg$c31(s1, s5);
	                  s0 = s1;
	                } else {
	                  peg$currPos = s0;
	                  s0 = peg$FAILED;
	                }
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseValue() {
	      var s0, s1, s2, s3;
	
	      s0 = peg$currPos;
	      if (input.substr(peg$currPos, 2) === peg$c32) {
	        s1 = peg$c32;
	        peg$currPos += 2;
	      } else {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c33); }
	      }
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parseName();
	        if (s2 !== peg$FAILED) {
	          if (input.substr(peg$currPos, 2) === peg$c34) {
	            s3 = peg$c34;
	            peg$currPos += 2;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c35); }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c36(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        if (input.charCodeAt(peg$currPos) === 58) {
	          s1 = peg$c37;
	          peg$currPos++;
	        } else {
	          s1 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c38); }
	        }
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parseName();
	          if (s2 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c39(s2);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseColumns() {
	      var s0, s1, s2, s3, s4, s5;
	
	      peg$silentFails++;
	      s0 = peg$currPos;
	      s1 = peg$parseAliasedColumnName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 === peg$FAILED) {
	          s2 = null;
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 44) {
	            s3 = peg$c13;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c14); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 === peg$FAILED) {
	              s4 = null;
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseColumns();
	              if (s5 !== peg$FAILED) {
	                s1 = [s1, s2, s3, s4, s5];
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$parseAliasedColumnName();
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          if (input.charCodeAt(peg$currPos) === 42) {
	            s1 = peg$c41;
	            peg$currPos++;
	          } else {
	            s1 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c42); }
	          }
	          if (s1 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c43();
	          }
	          s0 = s1;
	        }
	      }
	      peg$silentFails--;
	      if (s0 === peg$FAILED) {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c40); }
	      }
	
	      return s0;
	    }
	
	    function peg$parseAliasedColumnName() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseColumnName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 !== peg$FAILED) {
	          if (input.substr(peg$currPos, 2) === peg$c44) {
	            s3 = peg$c44;
	            peg$currPos += 2;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c45); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseName();
	              if (s5 !== peg$FAILED) {
	                s1 = [s1, s2, s3, s4, s5];
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseColumnName();
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parse_();
	          if (s2 !== peg$FAILED) {
	            s3 = peg$parseName();
	            if (s3 !== peg$FAILED) {
	              s1 = [s1, s2, s3];
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$parseColumnName();
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseColumnName() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 === peg$FAILED) {
	          s2 = null;
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 46) {
	            s3 = peg$c46;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c47); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 === peg$FAILED) {
	              s4 = null;
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseName();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c15(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseName();
	        if (s1 !== peg$FAILED) {
	          peg$savedPos = s0;
	          s1 = peg$c48(s1);
	        }
	        s0 = s1;
	      }
	
	      return s0;
	    }
	
	    function peg$parseFrom() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseAliasedName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 === peg$FAILED) {
	          s2 = null;
	        }
	        if (s2 !== peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 44) {
	            s3 = peg$c13;
	            peg$currPos++;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c14); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 === peg$FAILED) {
	              s4 = null;
	            }
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseFrom();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c15(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseAliasedName();
	        if (s1 !== peg$FAILED) {
	          peg$savedPos = s0;
	          s1 = peg$c48(s1);
	        }
	        s0 = s1;
	      }
	
	      return s0;
	    }
	
	    function peg$parseAliasedName() {
	      var s0, s1, s2, s3, s4, s5;
	
	      s0 = peg$currPos;
	      s1 = peg$parseName();
	      if (s1 !== peg$FAILED) {
	        s2 = peg$parse_();
	        if (s2 !== peg$FAILED) {
	          if (input.substr(peg$currPos, 2) === peg$c44) {
	            s3 = peg$c44;
	            peg$currPos += 2;
	          } else {
	            s3 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c45); }
	          }
	          if (s3 !== peg$FAILED) {
	            s4 = peg$parse_();
	            if (s4 !== peg$FAILED) {
	              s5 = peg$parseName();
	              if (s5 !== peg$FAILED) {
	                peg$savedPos = s0;
	                s1 = peg$c49(s1, s5);
	                s0 = s1;
	              } else {
	                peg$currPos = s0;
	                s0 = peg$FAILED;
	              }
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	      if (s0 === peg$FAILED) {
	        s0 = peg$currPos;
	        s1 = peg$parseName();
	        if (s1 !== peg$FAILED) {
	          s2 = peg$parse_();
	          if (s2 !== peg$FAILED) {
	            s3 = peg$parseName();
	            if (s3 !== peg$FAILED) {
	              peg$savedPos = s0;
	              s1 = peg$c49(s1, s3);
	              s0 = s1;
	            } else {
	              peg$currPos = s0;
	              s0 = peg$FAILED;
	            }
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	        if (s0 === peg$FAILED) {
	          s0 = peg$currPos;
	          s1 = peg$parseName();
	          if (s1 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c50(s1);
	          }
	          s0 = s1;
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseKeyword() {
	      var s0;
	
	      if (input.substr(peg$currPos, 5) === peg$c4) {
	        s0 = peg$c4;
	        peg$currPos += 5;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c5); }
	      }
	      if (s0 === peg$FAILED) {
	        if (input.substr(peg$currPos, 4) === peg$c2) {
	          s0 = peg$c2;
	          peg$currPos += 4;
	        } else {
	          s0 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c3); }
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parseName() {
	      var s0, s1, s2, s3, s4;
	
	      s0 = peg$currPos;
	      s1 = peg$currPos;
	      peg$silentFails++;
	      s2 = peg$parseKeyword();
	      peg$silentFails--;
	      if (s2 === peg$FAILED) {
	        s1 = void 0;
	      } else {
	        peg$currPos = s1;
	        s1 = peg$FAILED;
	      }
	      if (s1 !== peg$FAILED) {
	        if (peg$c51.test(input.charAt(peg$currPos))) {
	          s2 = input.charAt(peg$currPos);
	          peg$currPos++;
	        } else {
	          s2 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c52); }
	        }
	        if (s2 !== peg$FAILED) {
	          s3 = [];
	          if (peg$c53.test(input.charAt(peg$currPos))) {
	            s4 = input.charAt(peg$currPos);
	            peg$currPos++;
	          } else {
	            s4 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c54); }
	          }
	          while (s4 !== peg$FAILED) {
	            s3.push(s4);
	            if (peg$c53.test(input.charAt(peg$currPos))) {
	              s4 = input.charAt(peg$currPos);
	              peg$currPos++;
	            } else {
	              s4 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c54); }
	            }
	          }
	          if (s3 !== peg$FAILED) {
	            peg$savedPos = s0;
	            s1 = peg$c55(s2, s3);
	            s0 = s1;
	          } else {
	            peg$currPos = s0;
	            s0 = peg$FAILED;
	          }
	        } else {
	          peg$currPos = s0;
	          s0 = peg$FAILED;
	        }
	      } else {
	        peg$currPos = s0;
	        s0 = peg$FAILED;
	      }
	
	      return s0;
	    }
	
	    function peg$parseWhiteSpace() {
	      var s0;
	
	      if (input.charCodeAt(peg$currPos) === 32) {
	        s0 = peg$c56;
	        peg$currPos++;
	      } else {
	        s0 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c57); }
	      }
	      if (s0 === peg$FAILED) {
	        if (input.charCodeAt(peg$currPos) === 10) {
	          s0 = peg$c58;
	          peg$currPos++;
	        } else {
	          s0 = peg$FAILED;
	          if (peg$silentFails === 0) { peg$fail(peg$c59); }
	        }
	        if (s0 === peg$FAILED) {
	          if (input.charCodeAt(peg$currPos) === 13) {
	            s0 = peg$c60;
	            peg$currPos++;
	          } else {
	            s0 = peg$FAILED;
	            if (peg$silentFails === 0) { peg$fail(peg$c61); }
	          }
	          if (s0 === peg$FAILED) {
	            if (input.charCodeAt(peg$currPos) === 9) {
	              s0 = peg$c62;
	              peg$currPos++;
	            } else {
	              s0 = peg$FAILED;
	              if (peg$silentFails === 0) { peg$fail(peg$c63); }
	            }
	          }
	        }
	      }
	
	      return s0;
	    }
	
	    function peg$parse_() {
	      var s0, s1, s2;
	
	      peg$silentFails++;
	      s0 = peg$currPos;
	      s1 = [];
	      s2 = peg$parseWhiteSpace();
	      if (s2 !== peg$FAILED) {
	        while (s2 !== peg$FAILED) {
	          s1.push(s2);
	          s2 = peg$parseWhiteSpace();
	        }
	      } else {
	        s1 = peg$FAILED;
	      }
	      if (s1 !== peg$FAILED) {
	        peg$savedPos = s0;
	        s1 = peg$c65();
	      }
	      s0 = s1;
	      peg$silentFails--;
	      if (s0 === peg$FAILED) {
	        s1 = peg$FAILED;
	        if (peg$silentFails === 0) { peg$fail(peg$c64); }
	      }
	
	      return s0;
	    }
	
	    peg$result = peg$startRuleFunction();
	
	    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
	      return peg$result;
	    } else {
	      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
	        peg$fail({ type: "end", description: "end of input" });
	      }
	
	      throw peg$buildException(
	        null,
	        peg$maxFailExpected,
	        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
	        peg$maxFailPos < input.length
	          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
	          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
	      );
	    }
	  }
	
	  return {
	    SyntaxError: peg$SyntaxError,
	    parse:       peg$parse
	  };
	})();


/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
		"0": "System error",
		"1": "Lovefield library version mismatch.",
		"2": "The database has not initialized yet.",
		"3": "Operation timeout.",
		"4": "Operation blocked.",
		"5": "Storage quota exceeded.",
		"6": "Too many rows: B-Tree implementation supports at most {0} rows.",
		"7": "Service {0} not registered.",
		"8": "Unknown query plan node.",
		"100": "Data error",
		"101": "Table {0} not found.",
		"102": "Data corruption detected.",
		"103": "Row id must be numbers.",
		"106": "Attempt to access {0} outside of specified scope.",
		"107": "Invalid transaction state transition: {0} -> {1}.",
		"108": "Attempt to open a newer database with old code.",
		"109": "Attempt to insert a row number that already existed.",
		"110": "Attempt to import into a non-empty database.",
		"111": "Database name/version mismatch for import.",
		"112": "Import data not found.",
		"200": "Constraint error",
		"201": "Duplicate keys are not allowed.",
		"202": "Attempted to insert NULL value to non-nullable field {0}.",
		"203": "Foreign key constraint violation on constraint {0}.",
		"300": "Not supported",
		"351": "Firebase does not have raw transaction.",
		"352": "IndexedDB is not supported by platform.",
		"353": "WebSQL is not supported by platform.",
		"354": "Unable to open WebSQL database.",
		"355": "WebSQL does not support change notification.",
		"356": "Use WebSQL instance to create transaction instead.",
		"357": "toSql() does not support predicate type: {0}.",
		"358": "toSql() is not implemented for {0}.",
		"359": "LocalStorage is not supported by platform.",
		"360": "Not implemented yet.",
		"500": "Syntax error",
		"501": "Value is not bounded.",
		"502": "Naming rule violation: {0}.",
		"503": "Name {0} is already defined.",
		"504": "Can not use autoIncrement with a non-integer primary key.",
		"505": "Can not use autoIncrement with a cross-column primary key.",
		"506": "Lovefield allows only immediate evaluation of cascading constraints.",
		"507": "Cross-column index {0} refers to nullable columns: {1}.",
		"508": "Table {0} does not have column: {1}.",
		"509": "Attempt to index table {0} on non-indexable column {1}.",
		"510": "Cannot bind to given array: out of range.",
		"511": "IndexedDB tables needs to be acquired from transactions.",
		"512": "WebSQL tables needs to be acquired from transactions.",
		"513": "Unknow query context.",
		"514": "Unknown node type.",
		"515": "from() has already been called.",
		"516": "where() has already been called.",
		"517": "Invalid usage of delete().",
		"518": "Invalid usage of insert().",
		"519": "Attempted to insert or replace in a table with no primary key.",
		"520": "into() has already been called.",
		"521": "values() has already been called.",
		"522": "Invalid usage of select().",
		"523": "Binding parameters of limit/skip without providing values.",
		"524": "Invalid usage of lf.fn.distinct().",
		"525": "Invalid projection list or groupBy columns.",
		"526": "Invalid projection list: mixing aggregated with non-aggregated.",
		"527": "Invalid aggregation detected: {0}",
		"528": "limit() has already been called.",
		"529": "skip() has already been called.",
		"530": "groupBy() has already been called.",
		"531": "Number of rows must not be negative for limit/skip.",
		"532": "Invalid usage of update().",
		"533": "Foreign key loop detected.",
		"534": "Foreign key {0} refers to source column of another foreign key.",
		"535": "Schema is already finalized.",
		"536": "Foreign key {0} refers to invalid table.",
		"537": "Foreign key {0} refers to invalid column.",
		"538": "Foreign key {0} column type mismatch.",
		"539": "Foreign key {0} refers to non-unique column.",
		"540": "Foreign key {0} has invalid reference syntax.",
		"541": "Outer join accepts only join predicate.",
		"542": "from() has to be called before innerJoin() or leftOuterJoin().",
		"543": "Foreign key {0}. A primary key column can't also be a foreign key child column",
		"544": "Duplicate primary key index found at {0}",
		"545": "Primary key column {0} can't be marked as nullable",
		"546": "Indices/constraints/columns can't re-use the table name {0}",
		"547": "where() cannot be called before innerJoin() or leftOuterJoin().",
		"548": "from() has to be called before where().",
		"549": "from() has to be called before orderBy() or groupBy().",
		"900": "Test error",
		"999": "Simulated error"
	};

/***/ }
/******/ ]);
//# sourceMappingURL=polylove.global.js.map