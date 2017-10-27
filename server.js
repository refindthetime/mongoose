var express = require('express');
var app = express();
var mongojs = require('mongojs')
var bodyParser = require('body-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var request = require('request'); 
var cheerio = require('cheerio');
var PORT = process.env.PORT || 3000;

app.use(logger('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));

// make public a static dir
app.use(express.static('public'));

// Database configuration
var databaseUrl = "videoscraper";
var collections = ["videoscraperData"];

var db = mongojs(databaseUrl, collections);
// Database with mongoose
mongoose.connect('mongodb://localhost/videoscraper');
var db = mongoose.connection;

db.on('error', function(err) {
  console.log('Mongoose Error: ', err);
});

// once logged in to the db through mongoose, log a success message
db.once('open', function() {
  console.log('Mongoose connection successful.');
});


// Note and Article models
var Note = require('./models/Note.js');
var Article = require('./models/Article.js');


// Routes
// ======
app.get('/', function(req, res) {
  res.send(index.html);
});

// A GET request to scrape the echojs website.
app.get('/scrape', function(req, res) {
  request('https://www.youtube.com/', function(error, response, html) {
 
    var $ = cheerio.load(html);
   
    $('h3').each(function(i, element) {

    		//  empty result object
				var result = {};

				//add result title and link
				result.title = $(this).children('a').text();
				result.link = $(this).children('a').attr('href');

				// grab snippet that's under link (text)
				result.snippet = $(this).next().text();

				// grab video image
				result.vidimage = "Wouldn't it be nice if a thumbnail appeared here?";
				// $(this).parent().children('a').children('div').children('img').attr('ytd-thumbnail')


				// using our Article model, create a new entry.
				
				// Notice the (result):
				// This effectively passes the result object to the entry (and the title and link)
				var entry = new Article (result);

				// now, save that entry to the db
				entry.save(function(err, doc) {
					// log any errors
				  if (err) {
				    console.log(err);
				  } 
				  // or log the doc
				  else {
				    console.log(doc);
				  }
				});


    });
  });
  
  res.send('<a href="index.html">Scrape Complete</a>');
});

// this will get the articles
app.get('/articles', function(req, res){

	// grab documents from Articles array
	Article.find({}, function(err, doc){
		// log any errors
		if (err){
			console.log(err);
		} 
		else {
			console.log("articles working");
			res.json(doc);
		}
	});
});

// grab an article by it's ObjectId
app.get('/articles/:id', function(req, res){
	
	Article.findOne({'_id': req.params.id})

	.populate('note')
	// now, execute our query
	.exec(function(err, doc){
		// log any errors
		if (err){
			console.log(err);
		} 
		// otherwise, send the doc to the browser as a json object
		else {
			res.json(doc);
		}
	});
});


app.post('/articles/:id', function(req, res){
	// create a new note and pass the req.body to the entry.
	var newNote = new Note(req.body);

	// and save the new note the db
	newNote.save(function(err, doc){
		// log any errors
		if(err){
			console.log(err);
		} 
		// otherwise
		else {
			// using the Article id passed in the id parameter of our url, 
			// prepare a query that finds the matching Article in our db
			// and update it to make it's lone note the one we just saved
			Article.findOneAndUpdate({'_id': req.params.id}, {'note':doc._id})
			// execute the above query
			.exec(function(err, doc){
				// log any errors
				if (err){
					console.log(err);
				} else {
					// or send the document to the browser
					res.send(doc);
				}
			});
		}
	});
});







// listen on port 3000
app.listen(PORT, function() {
  console.log('App running on port 3000!');
});