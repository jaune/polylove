var expect = chai.expect;

describe('Polylove', function() {
	
  before(function(done) {
    var db;

    // create schema
    var schemaBuilder = lf.schema.create('tests.mvdb', 1);

    schemaBuilder.createTable('Movie')
      .addColumn('id', lf.Type.INTEGER)
      .addColumn('title', lf.Type.STRING)
      .addColumn('year', lf.Type.INTEGER)
      .addColumn('rating', lf.Type.STRING)
      .addColumn('company', lf.Type.STRING)
      .addPrimaryKey(['id'])
      .addNullable(['year', 'rating', 'company'])
    ;

    schemaBuilder.connect()
    .then(function(database) {
      db = database;

      var t = db.getSchema().table('Movie');

      var rows = [];
      
      rows.push(t.createRow({
        'id': 1,
        'title': 'Get a cup of coffee',
        'year': 2015,
      }));

      rows.push(t.createRow({
        'id': 2,
        'title': 'Qsfq sf qsfqsf',
        'year': 2015,
      }));

      rows.push(t.createRow({
        'id': 3,
        'title': 'Ezea za dazdad',
        'year': 2014,
      }));

      rows.push(t.createRow({
        'id': 4,
        'title': 'Dsdg ezegz eg',
        'year': 2014,
      }));        

      return db.insertOrReplace().into(t).values(rows).exec();
    })
    .then(function () {
      console.log('---Ready---');
      polylove.ready(db);
      done();
    })
    .catch(function (error) {
      if (!error.code) {
        throw error;
        return;
      }
      throw polylove.getErrorMessage(error);
    });
  });

	it('polylove global', function () {
		expect(polylove).to.be.an('object');	
	});

/*
  describe('#behavior()', function() {
  	


    after(function() {
    });

    it('SELECT', function () {
      var b = polylove.behavior({
        'movies': 'SELECT * FROM Movie WHERE Movie.year = {{year}} ORDER BY Movie.title {{direction}}'
      });

      expect(b.observers).to.deep.equal(['_moviesObserver(year, direction)']);
      expect(b._moviesObserver).to.be.a('function');
    });

  });
*/
  describe('QueryManager', function() {
    describe('#createQuery()', function() {
      it('SELECT * FROM Movie WHERE Movie.year = {{year}} ORDER BY Movie.title {{direction}}', function () {
        var q = polylove.qm.create('SELECT * FROM Movie WHERE Movie.year = {{year}} ORDER BY Movie.title {{direction}}');
      });
    });
  });

  describe('Query', function() {
    describe('#run()', function() {
      it('"SELECT * FROM Movie WHERE Movie.year = {{year}}" with { year: 2014 }', function (done) {
        var q = polylove.qm.create('SELECT * FROM Movie WHERE Movie.year = {{year}}');

        q.run({ year: 2014 }, function (error, rows) {
          if (error) {
            if (error.code){
              return done(polylove.getErrorMessage(error)); 
            }
            return done(error);
          }

          expect(rows).to.deep.equal([
            { id: 3, title: "Ezea za dazdad", year: 2014},
            { id: 4, title: "Dsdg ezegz eg", year: 2014}            
          ]);

          return done();
        });
      });

      it('"SELECT * FROM Movie WHERE Movie.year = {{year}} ORDER BY Movie.title :direction" with { year: 2014 } and { direction : "ASC" }', function (done) {
        var q = polylove.qm.create('SELECT * FROM Movie WHERE Movie.year = {{year}} ORDER BY Movie.title :direction', {direction: 'ASC'});

        q.run({ year: 2014 }, function (error, rows) {
          if (error) {
            if (error.code){
              return done(polylove.getErrorMessage(error)); 
            }
            return done(error);
          }

          expect(rows).to.deep.equal([
            { id: 4, title: "Dsdg ezegz eg", year: 2014},
            { id: 3, title: "Ezea za dazdad", year: 2014}
          ]);

          return done();
        });
      });
    });
  });

});