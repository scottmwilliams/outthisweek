
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , apiKeys = require('apiKeys')
  , $ = require('jquery')
  , moment = require('moment')
  , cronJob = require('cron').CronJob
  , fs = require('fs');

var app = module.exports = express.createServer();

// Configuration


console.log(apiKeys.keys.rottentomatoes);

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


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
console.log("Make sure you change your api keys in node_modules/apikeys/index.js");

/////////  START OF GETTING RECENT FILMS FROM MDB ////////////
var job = new cronJob({
  cronTime: '0 0 * * *',
  onTick: function() {
    updateJson();
  },
  start: false
});
job.start();
updateJson();
var tmdbCollection = [];
var tmdbCollectionFullDetails = [];
var date = getReleaseWeek();
var path = 'public/json/'+date;
var tomatoesRecent;

function updateJson(){
  // Get recently released dvd's from rotten tomatoes
  var tomatoesRequest = $.ajax({
    url: 'http://api.rottentomatoes.com/api/public/v1.0/lists/dvds/new_releases.json?apikey='+apiKeys.keys.rottentomatoes+'&page_limit=20&page=1&country=us',
    type: 'GET',
    dataType: 'jsonp',
    data: {}
  });

  // When the request above is finished get additional data from tmdb and youtube
  $.when(tomatoesRequest).done(function(data){
     tomatoesRecent = data;
      var i = 0;
      var numberOfFilms = ((tomatoesRecent.movies.length)-1);
      fs.mkdir(path);
      fs.writeFile(path+'/'+'all-movies.json', JSON.stringify(tomatoesRecent.movies, null, 4));

        // build a new collection for objects containing additional information such as
        // trailer URL and poster and backdrop images 
        additionalInfo(tomatoesRecent.movies[i], tomatoesRecent.movies[i].title);

        function additionalInfo(movieObj, movieTitle){
          movieTitle = cleanTitle(movieTitle);
                if(i < numberOfFilms){            
                   var filename = path+'/'+movieTitle+'.json';
                    var URL = 'http://api.themoviedb.org/3/search/movie?api_key='+apiKeys.keys.themoviedb+'&query='+movieTitle;
                    var ajaxURL = encodeURI(URL);
                    $.ajax({
                      url: ajaxURL,
                      success: function(data, textStatus, xhr) {
                        var movie = data; 
                        $.ajax({
                          url: 'https://www.googleapis.com/youtube/v3/search?part=snippet&q='+movieTitle+'%20Official%20Trailer%20HD&key='+apiKeys.keys.google
                        }).success(function(data){
                          movieObj.trailer = data.items[0].id.videoId;
                          movieObj.poster_path = movie.results[0].poster_path;
                          movieObj.backdrop_path = movie.results[0].backdrop_path;
                          tmdbCollection.push(movieObj);
                          additionalInfo(tomatoesRecent.movies[i], tomatoesRecent.movies[i].title);
                          i++;
                        });
                      }
                    }); // end ajax call
                }
                else{
                  writeToFile();
                }
        }
  });

  // get conf file for tmdb this is needed to build the full URL from images
  $.ajax({
    url: 'http://api.themoviedb.org/3/configuration?api_key='+apiKeys.keys.themoviedb 
  }).success(function(data){
    fs.writeFile(path+'/'+'mdbConfig.json', JSON.stringify(data, null, 4));
  });
}

// when all the ajax requests are finished write the new movies collection to disk
function writeToFile(){
    fs.writeFile(path+'/'+'movies.json', JSON.stringify(tmdbCollection, null, 4));
}


////// below are utility function used in the code above //////////

// get the date of the first sunday of each week used to create the file path 
// for the JSON files
function getReleaseWeek(){
  var curr = new Date; // get current date
  var first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
  var last = first + 6; // last day is the first day + 6
  var firstday = new Date(curr.setDate(first)); // first sunday of the week
  var momentObject = moment(firstday); // date converted to moment.js
  var phasedDate = momentObject.format("D-M-YYYY"); // format with moment.js

  return phasedDate;
}

// removes odd charaters in titles
function cleanTitle(title){
  var symbols = {
    '@': '%40',
    '&amp;': 'and',
    '*': '%2A',
    '+': '%2B',
    '/': '%2F',
    '&lt;': '%3C',
    '&gt;': '%3E'
  };
  title = title.replace(/([@*+/]|&(amp|lt|gt);)/g, function (m) { return symbols[m]; });
  title = title.replace('&','and');
  return title;
}
