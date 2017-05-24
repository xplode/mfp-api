/**
 *  Interfaces with the MyFitnessPal public api.
 */
"use strict";

module.exports = new function() {
  this.host = 'www.myfitnesspal.com'
  // Session id is set by passing response headers to the setSession method.
  this.session = null;
  this.loggedIn = false;

  // Given response headers from mfp, sets the session.
  function extractSession(headers) {
    var cookies = headers['set-cookie'];
    var numCookies = cookies.length;

    // Find the session cookie.
    for ( var i = 0; i < numCookies; i++) {
      var cookie = cookies[i];

      if ( /^_session_id/.test(cookie) ) {
        return cookie.split(/[=;]/)[1];
      }
    }
    return null;
  };

  // Given the response body from mfp, sets the login authenticity_token.
  function extractLoginAuthToken(body) {
    return body.match(/www\.myfitnesspal.com\/account\/login.*authenticity_token.*value="(.*)"/)[1];
  };

  // Logs into mfp setting the session.
  this.login = function(username, password, callback) {
    var self = this;
    // Fetch the mfp homepage.
    getHeadersAndBody(null, 'https', self.host, '/', function(err, headers, body) {
      if (err) {
        callback(err);
      } else {
        // Intialize the session and auth token.
        self.session = extractSession(headers);
        var authToken = extractLoginAuthToken(body);

        postLogin(self.host, username, password, authToken, self.session, function(err, headers, body) {
          if (err) {
            callback(err);
          } else {
            // Update the session.
            self.session = extractSession(headers);
            self.loggedIn = true;
            console.log("MyFitnessPal login success!");
            callback(null);
          }
        });
      }
    });
  };

  // Fetches details for the food or exercise diaries.
  this.getDiary = function(type, date, callback) {
    var self = this;
    // Make sure the user has logged in.
    if (!self.loggedIn) {
      callback("You are not logged in!", null);
      return;
    }

    // Only set the query params for the date if a date was passed in.
    var path = '/' + type + '/diary';
    if (date) {
      path = path + '?date='+date;
    }

    getHeadersAndBody(
      {'Cookie': '_session_id='+self.session,
       'Accept': '*/*',
       'User-Agent': 'curl/7.50.3'
      },
      'http',
      self.host,
      path,
      function(err, headers, body) {
        if (err) {
          console.log(err);
          console.log("An error occurred when fetching the "+ type + " diary for " + date);
          callback(err, null);
        } else {
          // Cool, we've got the food diary, let's parse it out.
          var diary = null;
          if (type === 'food') {
            diary = parseFoodDiary(body);
          } else if (type === 'exercise') {
            diary = parseExerciseDiary(body);
          }

          console.log(JSON.stringify(diary));
          callback(err, diary);
        }
      }
    );
  };

  function parseFoodDiary(body) {
    // Extract the daily goal, total and whether or not the entry is complete.
    // Normally I would do this more elegantly, but I don't want to process the
    // recreate the whole damn dom.  Any solution will be fragile, so regex's
    // it is.  Making each seperate is processing but easier to maintain.
    var goal = body.match(/Daily Goal <\/td>\n\n\n\s*<td>(.*)<\/td>/)[1]
    var total = body.match(/Totals<\/td>\n\n\n\s*<td.*>(.*)<\/td>/)[1]
    var completed = body.match(/Make Additional Entries/) !== null;

    // Remove any comma's in our integer strings and convert to ints.
    var result = {
      'goal': parseInt(goal.replace(',','')),
      'total': parseInt(total.replace(',','')),
      'completed': completed
    };
    return result
  }

  function parseExerciseDiary(body) {
    // Extract all exercise descriptions.
    // This is ugly I apologize :(
    var matches = body.match(/showEditExercise.*\n.*\n/g);
    if (matches === null) {
      matches = [];
    } else {
      for (var i = 0; i < matches.length; i++) {
        matches[i] = matches[i].replace(/.*"#">\n?\s*|<\/a>(\s|\S)*|\n$/g,'')
      }
    }
    return matches;
  }

  // Performs a get calling back with the fetched headers and body.
  function getHeadersAndBody(headers, protocol, host, path, callback) {
    var http = require(protocol);

    var options = {
      host: host,
      path: path,
    };

    // Set any headers that may have been passed in.
    if (headers) {
      options.headers = headers;
    }

    console.log(JSON.stringify(options));

    http.request(options, function(response) {
      var err=null;
      if (response.statusCode > 399) {
        err="Status code: " + response.statusCode;
      }
      var body = ''
      // Check for failure response code.
      response.on('data', function (chunk) {
        body += chunk;
      });

      response.on('end', function () {
        // We have all the data.
        callback(err, response.headers, body);
      });
    }).end();
  }


  // Performs a post on /account/login.
  function postLogin(host, username, password, authToken, session, callback) {
    var http = require('https');
    var querystring = require('querystring');

    var postData = querystring.stringify({
      'authenticity_token': authToken,
      'username': username,
      'password': password,
      'remember_me': 1
    });

    var options = {
      host: host,
      path: '/account/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)//,
        //'_session_id': session
      }
    };

    var postReq = http.request(options, function(response) {
      response.setEncoding('utf8');
      if (response.statusCode !== 302) {
        // We expect to get a redirect on a successful login.  Weirdly mfp returns
        // code 200 for a failed login.
        console.log("Expected to get a redirect on a successful login, but didn't");
        callback("Status code: " + response.statusCode, null, null);
      } else {
        var body = ''
        // Check for failure response code.
        response.on('data', function (chunk) {
          body += chunk;
        });

        response.on('end', function () {
          // We have all the data.
          callback(null, response.headers, body);
        });
      }
    });

    // Post the data.
    postReq.write(postData);
    postReq.end();
  }
};
