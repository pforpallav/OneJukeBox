# OneJukebox
Spotify playlist collaboration through Slack. Based on [SlackBox](https://github.com/benchmarkstudios/slackbox).

Simply create a Slash Command, such as `/jukebox`, which accepts a track name (also the artist too for a less fuzzy search) to add to a pre-defined Spotify playlist:

    /jukebox Bell Biv DeVoe – Poison
    
And/Or add it as a listener on your slack channel; paste YouTube/Spotify links to get your song added to the shared playlist!

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Installation

### Slash Command setup
First you'll want to create your Slack Slash Command, which you can do by going to your [Slash Commands page](https://my.slack.com/services/new/slash-commands).

During setup, have your slash command submit a POST to your app's `/store` endpoint, e.g. `https://app-name.herokuapp.com/store`.

Make a note of the `Token`, as you'll need it later to help guard against cross-site request forgery.

### Slack Channel Listener setup
1. Head to Slack > CustomIntegrations > `Outgoing Webhooks` and add a new configuration. Set the `Channel` to listen to, and add your app's `/parse` endpoint (e.g. `https://app-name.herokuapp.com/parse`) to **URL(s)**. Make a note of the `Token`, as you'll need it later to help guard against cross-site request forgery.
2. Head to Slack > CustomIntegrations > `Incoming Webhooks` and add a new configuration. Note the `Webhook URL` for the settings and customize the look of the incoming message bot to your preference.

### Spotify

Head over to [Spotify's Developer Site](http://developer.spotify.com) and create a new Application. Make sure you add whatever slackbox's callback URI as a valid callback URI. If you're running locally, this will be `/callback` endpoint (e.g. on Heroku `https://app-name.herokuapp.com/callback`).

Make a note of the `key`, `secret` and `callback URI` too, as you'll need these later as well.

Also, don't forget to make a playlist. If you do this through [Spotify's web interface](http://play.spotify.com) then the `playlist identifier` will be the last segment of the URI - make a note of this too! If there's a better way of finding this out, we're all ears. If you do this through the app, right-click the playlist to get it's web URL and again, you need the last segment of the URI.

### Environment variables

Once you've cloned OneJukeBox or hit the "Deploy with Heroku" button you'll need to setup the following environment variables. These can either be stored in a `.env` file or set up as config variables in Heroku.

* `SLACK_TOKEN` - The token from Slack's Slash Command.
* `SLACK_TOKEN2` - The token from Slack's Outgoing Webhook.
* `SLACK_INCOMING_HOOK_URL` - The WebhookURL from Slack's Incoming Webhooks.
* `SPOTIFY_KEY` - Your Spotify application key (a.k.a Client ID).
* `SPOTIFY_SECRET` - Your Spotify application secret (a.k.a Client Secret).
* `SPOTIFY_USERNAME` - Your Spotify username.
* `SPOTIFY_PLAYLIST_ID` - Your playlist identifier.
* `SPOTIFY_REDIRECT_URI` - URI to redirect to once your user has allowed the application's permissions.

### Authentication

Visit your OneJukeBox's `/authorise` end to authenticate yourself with Spotify and you should be all set!
