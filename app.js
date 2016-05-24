var express       = require('express');
var bodyParser    = require('body-parser');
var request       = require('request');
var dotenv        = require('dotenv');
var SpotifyWebApi = require('spotify-web-api-node');
var jsesc         = require('jsesc');

dotenv.load();

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_KEY,
  clientSecret: process.env.SPOTIFY_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

function extractYouTubeURLs(text) {
  var re = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/ig;
  return text.match(re);
}

function extractSpotifyURIs(text) {
  var re = /(?:(?:https\:\/\/)?open\.spotify\.com\/track\/|spotify\:track\:)([A-Za-z0-9]+)/ig;
  //debugger;
  var matches, output = [];
  while (matches == re.exec(text)) {
    output.push(matches[1]);
  }
  return output;
}

function spotifySearchAndAddToPlaylistAndReply(query, req, res) {
  spotifyApi.searchTracks(query)
    .then(function(data) {
      var results = data.body.tracks.items;
      if (results.length === 0) {
        return res.send('Could not find that track.');
      }
      var track = results[0];
      spotifyAddToPlaylist(track.id, req, res);

      var payLoad = '{"username": "One-JukeBox", "icon_emoji": ":musical_note:", "unfurl_links": false, "unfurl_media": false, "text": "_*' + req.body.user_name + '* added a track_\n<https://open.spotify.com/user/1195834090/playlist/54bQo24d8g6uig4Pes6xpv|*' + jsesc(track.name,{'quotes': 'double'}) + '*> by *' + jsesc(track.artists[0].name,{'quotes': 'double'}) + '*"}';
      console.log(payLoad);
      request.post(process.env.SLACK_INCOMING_HOOK_URL,
        {form: {payload: payLoad}},
        function(error, response, body) {
          console.log(body);
        });

      return res.send('');
    }, function(err) {
      return res.send(err.message);
  });
}

function spotifyAddToPlaylist(trackid, req, res) {
  //debugger;
  spotifyApi.addTracksToPlaylist(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PLAYLIST_ID, ['spotify:track:' + trackid])
    .then(function(data) {
      return res.send('');
    }, function(err) {
      return res.send(err.message);
    });
}

app.get('/', function(req, res) {
  if (spotifyApi.getAccessToken()) {
    return res.send('You are logged in.');
  }
  return res.send('<a href="/authorise">Authorise</a>');
});

app.get('/authorise', function(req, res) {
  var scopes = ['playlist-modify-public', 'playlist-modify-private'];
  var state  = new Date().getTime();
  var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state);
  res.redirect(authoriseURL);
});

app.get('/callback', function(req, res) {
  spotifyApi.authorizationCodeGrant(req.query.code)
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      spotifyApi.setRefreshToken(data.body['refresh_token']);
      return res.redirect('/');
    }, function(err) {
      return res.send(err);
    });
});

app.use('/store', function(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN) {
    return res.status(500).send('Cross site request forgerizzle!');
  }
  next();
});

app.post('/store', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }
      if (req.body.text.indexOf(' - ') === -1) {
        var query = 'track:' + req.body.text;
      } else {
        var pieces = req.body.text.split(' - ');
        var query = 'artist:' + pieces[0].trim() + ' track:' + pieces[1].trim();
      }
      spotifyAddToPlaylistAndReply(query, req, res);
    }, function(err) {
      return res.send('Could not refresh access token. You probably need to re-authorise yourself from your app\'s homepage.');
    });
});

app.use('/parse', function(req, res, next) {
  if (req.body.token !== process.env.SLACK_TOKEN2) {
    return res.status(500).send('Cross site request forgerizzle!');
  }
  next();
});

app.post('/parse', function(req, res) {
  spotifyApi.refreshAccessToken()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      if (data.body['refresh_token']) {
        spotifyApi.setRefreshToken(data.body['refresh_token']);
      }

      //debugger;
      var arrayYouTubeURLs = extractYouTubeURLs(req.body.text);
      if (arrayYouTubeURLs !== null) {
        for (i = 0; i < arrayYouTubeURLs.length; i++) {
          var youtubeOEmbedRequest = 'https://www.youtube.com/oembed?url=' + arrayYouTubeURLs[i];
          request.get(youtubeOEmbedRequest)
            .on('data', function(data) {
              var title = JSON.parse(data).title;
              if (title.indexOf(' - ') === -1) {
                var songRegex = /\s?([^\(\[\)\]]+)[\(\[]?/g;
                var song = songRegex.exec(title)[1];
                var query = 'track:' + song.trim();
              } else {
                var artistRegex = /(.+)\s?(?=\-)/g;
                var songRegex = /-\s?([^\(\[\)\]]+)[\(\[]?/g;
                var artist = artistRegex.exec(title)[1];
                var song = songRegex.exec(title)[1];
                var query = 'artist:' + artist.trim() + ' track:' + song.trim();
              }
              spotifySearchAndAddToPlaylistAndReply(query, req, res);
            });
        }
      }

      //debugger;
      var arraySpotifyTrackURIs = extractSpotifyURIs(req.body.text);
      if (arraySpotifyTrackURIs !== null) {
        for (i = 0; i <  arraySpotifyTrackURIs.length; i++) {
          spotifyAddToPlaylist(arraySpotifyTrackURIs[i], req, res);

          var payLoad = '{"username": "One-JukeBox", "icon_emoji": ":musical_note:", "unfurl_links": false, "unfurl_media": false, "text": "_*' + req.body.user_name + '* added a_ <https://open.spotify.com/user/1195834090/playlist/54bQo24d8g6uig4Pes6xpv|*track*>"}';
          console.log(payLoad);
          request.post(process.env.SLACK_INCOMING_HOOK_URL,
            {form: {payload: payLoad}},
            function(error, response, body) {
              console.log(body);
            });
        }
      }
    });
});

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'));
