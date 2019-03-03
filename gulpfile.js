// Gulp
var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');

// Server
var express = require('express');
var cors    = require('cors');
var cookieParser = require('cookie-parser');
var bodyParser = require("body-parser")
var querystring  = require('querystring');
var request = require('request');

// Spotify API
var CLIENT_ID = 'd7ae275d270b49e195a8646a76813578'; // Client ID
var CLIENT_SECRET = '60e6bddad7294922ade42ac0c1dca865'; // Secret
var STATE_KEY = 'spotify_auth_state';
var REDIRECT_URI = 'http://192.168.1.8:3001/callback';
var URL = 'http://192.168.1.8:3000';

// Main Gulp task: initialize the backend Express REST API and auto-reloading Gulp server
gulp.task('serve', ['sass'], function() {
  serve(); // Call the serve *function* to host the Express server
  browserSync.init({ server: "./app" }); // Start hosting everything in the app folder (probably on localhost:3000)
  gulp.watch("app/scss/*.scss", ['sass']); // Look for changes in the SCSS folder. When a change is made, recompile SCSS and reload the browser
  gulp.watch("app/js/*.js").on('change', browserSync.reload); // Look for changes in the JS folder. When a change is made, reload the browser
  gulp.watch("app/*.html").on('change', browserSync.reload); // Look for changes in HTML. When a change is made, reload the browser
});

// Compile SCSS into CSS & auto-inject into browsers
gulp.task('sass', function() {
  return gulp.src("app/scss/*.scss")
    .pipe(sass().on('error', function(err) { // Check for SCSS errors
        console.error(err.message); // Log SCSS error to console
        browserSync.notify('<h1 style="background-color: red">ERROR</h1>', 5000); // Display error on the browser screen
        this.emit('end'); // Prevent gulp from catching the error and exiting the watch process
    }))
    .pipe(gulp.dest("app/css")) // Send processed SCSS to CSS folder
    .pipe(browserSync.stream()); // Stream the updated CSS
});

gulp.task('default', ['serve']);

// Express Server
function serve(){
  // 1) Create and configure Express object
  var app = express();
  app.use(express.static(__dirname + '/app'))
  app.use(cors())
     .use(cookieParser())
     .use(bodyParser.json())
     .use(bodyParser.urlencoded({ extended: true }));

  // 2) Define random string function for Oath2
  function randomString(length) {
   var text = '';
   var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   for (var i = 0; i < length; i++)
     text += possible.charAt(Math.floor(Math.random() * possible.length));
   return text;
  }

  // 3) GET request for login
  app.get('/login', function(req, res) {
    var state = randomString(16); // Create Oath2 key
    res.cookie(STATE_KEY, state); // Save key to cookies
    var scope = 'user-top-read user-read-private user-read-email playlist-modify-public'; // Spotify API scope
    // a) Send authorization request to Spotify
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state,
        show_dialog: true
      }));
  });

  // 4) GET request from login callback--send the auth key to the user's browser
  app.get('/callback', function(req, res) {
    // a) Variable initialization
    var code  = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[STATE_KEY] : null;

    // b) Check for callback error
    if (state===null || state!==storedState) res.redirect(URL+'/#'+querystring.stringify({error:'state_mismatch'}));
    else { // No callback error
      // c) Setup authorization options
      res.clearCookie(STATE_KEY);
      var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        },
        json: true
      };

      // d) Send POST request to verify authorization
      request.post(authOptions, function(error, response, body) {
        // Authorization is valid! Pass the access token to the user's browser
        if (!error && response.statusCode === 200) {
          res.redirect(URL+'/#'+querystring.stringify({access_token: body.access_token}));
        }
        // Authorization is invalid. Pass this information along to the user's browser
        else {
          res.redirect(URL+'/#'+querystring.stringify({error:'invalid_token'}));
        }
      });
    }
  });

  // 5) Host the REST API
  const server = app.listen(process.env.PORT || 3001, () => {
    const port = server.address().port;
    console.log(`App listening on port ${port}`);
  });
}
