
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , jsdom = require('jsdom')
  , $ = require('jQuery')
  , moment = require('moment')
  , fs = require('fs');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.register('.html', require('jade'));
app.get('/', function(req, res) {
    fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
        res.send(text);
    });
});


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


/////////  START OF GETTING RECENT FILMS FROM MDB ////////////

var movieCollection = [];
var movieCollectionFullDetails = [];
var date = getReleaseWeek();
var path = 'public/json/'+date;
var tomatoesRecent;

var tomatoesRequest = $.ajax({
  url: 'http://api.rottentomatoes.com/api/public/v1.0/lists/dvds/new_releases.json?apikey=dtxq8gh9vybznax2hha3mcqg',
  type: 'GET',
  dataType: 'jsonp',
  data: {}
});

$.when(tomatoesRequest).done(function(data){
   tomatoesRecent = data;
    var i = 1;
    fs.mkdir(path);
    fs.writeFile(path+'/'+'all-movies.json', JSON.stringify(tomatoesRecent.movies, null, 4));

    for(var x in tomatoesRecent.movies){
      var currentMovie = tomatoesRecent.movies[x].title;
      // for each item call the getMDBitem function below which builds the film collection
      getMDBitem(currentMovie);

      function getMDBitem(theMovie){
        theMovie = cleanTitle(theMovie);

        var filename = path+'/'+theMovie+'.json';
        var URL = 'http://api.themoviedb.org/3/search/movie?api_key=c1a2641a1bdc4fe90e68907afed3e1e5&query='+theMovie;
        var ajaxURL = encodeURI(URL);
        $.ajax({
          url: ajaxURL,
          success: function(data, textStatus, xhr) {
            movieCollection.push(data.results[0]);
            writeToFile(i);
            i++;
            // old line that writes out a file for each movie
            // fs.writeFile(filename, JSON.stringify(data.results[0], null, 4));
           
          }
        }); // end ajax call
      } 
    } // end for in
});

function getMoreDetails(movies){
  var i = 1;
  for (var x in movies){
  	try{
  		var Movie = movies[x].id;
  	}
	catch(err){
		// sometimes a movie can note be found on themovie database if this is
		// the case catch the error thrown 
		console.log('error =',err);
	}
    
    getMDBitemFull(Movie);

    function getMDBitemFull(currentMovie){
      var ajaxURL = 'http://api.themoviedb.org/3/movie/'+currentMovie+'?api_key=c1a2641a1bdc4fe90e68907afed3e1e5';
      $.ajax({
          url: ajaxURL,
          success: function(data, textStatus, xhr) {
             movieCollectionFullDetails.push(data);
             if(i == movies.length){
              // sort the film collection array by popularity
              movieCollectionFullDetails.sort(function(obj1, obj2){
                return obj2.popularity - obj1.popularity;
              });
              
              fs.writeFile(path+'/'+'movies-collection.json', JSON.stringify(movieCollectionFullDetails, null, 4));
             }
            i++;
          }
      }); // end ajax call
    }  
  }
}

function getReleaseWeek(){
  var curr = new Date; // get current date
  var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
  var last = first + 6; // last day is the first day + 6

  var firstday = new Date(curr.setDate(first)); // first sunday of the week

  var momentObject = moment(firstday); // date converted to moment.js
  var phasedDate = momentObject.format("D-M-YYYY"); // format with moment.js

  return phasedDate;
}


////// get configeration

$.ajax({
  url: 'http://api.themoviedb.org/3/configuration?api_key=c1a2641a1bdc4fe90e68907afed3e1e5' 
}).success(function(data){
  fs.writeFile(path+'/'+'mdbConfig.json', JSON.stringify(data, null, 4));
});

////// functions called above

// write the collection to a file
function writeToFile(b){
  if(b == tomatoesRecent.movies.length){ 

    getMoreDetails(movieCollection);
    // write the film collection to a file
  }
}

// removes odd charaters in titles
function cleanTitle(title){
  var symbols = {
    '@': '%40',
    '&amp;': '%26',
    '*': '%2A',
    '+': '%2B',
    '/': '%2F',
    '&lt;': '%3C',
    '&gt;': '%3E'
  };
  title = title.replace(/([@*+/]|&(amp|lt|gt);)/g, function (m) { return symbols[m]; });
  return title;
}


/////////  END OF GETTING RECENT FILMS FROM MDB ////////////


