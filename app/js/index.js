var access_token;
var selected_playlist;
var user_id;
var sorted_playlist_id;
var currentFeature = 'energy';
var currentPeak = 4;
var currentInverse = false;
var playlists = null;

// Simplifies GET requests to Spotify
function get(endpoint) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `https://api.spotify.com/v1/${endpoint}`,
      headers: { 'Authorization': 'Bearer ' + access_token, },
      success: response => { resolve(response); },
      error: err => {
        console.log(`Error: GET ${endpoint}`);
        reject(`Error: GET ${endpoint}`);
      }
    });
  });
}

// Simplifies POST requests to Spotify
function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'POST',
      url: `https://api.spotify.com/v1/${endpoint}`,
      headers: {
        'Authorization': 'Bearer ' + access_token,
      },
      data: JSON.stringify(data),
      contentType: "application/json; charset=utf-8",
      success: response => { resolve(response); },
      error: err => {
        console.log(`Error: POST ${endpoint}`);
        reject(`Error: POST ${endpoint}`);
      }
    });
  });
}

// Injects HTML and eventlisteners for Playlist graph and control options
function showSelected() {
  document.body.innerHTML = `
    <button id="back">Back</button>
    <div id="chart-container">
      <canvas id="chart"></canvas>
    </div>
    <div id="options">
      <div id="feature">
        <b>Feature to sort by</b><br>
        <button id='acousticness'>Acousticness</button><br>
        <button id='danceability'>Danceability</button><br>
        <button id='energy'>Energy</button><br>
        <button id='tempo'>Tempo</button><br>
        <button id='mood'>Mood</button><br>
      </div>
      <div id="peak">
        <b>Playlist shape</b><br>
        <button id='4'>Up</button><br>
        <button id='0'>Down</button><br>
        <button id='2'>Bell</button><br>
        <button id='1'>Left Skew</button><br>
        <button id='3'>Right Skew</button><br>
      </div>
      <div id="invert">
        <b>Other options</b><br>
        <button id="inversion">Toggle Invert</button><br>
        <button id="reset">Reset</button><br>
      </div>
      <div id="create">
        <b>Create New Playlist?</b><br>
        <button id="create-playlist">Create</button><br>
      </div>
    </div>
  `;
  $('#back').click(() => {
    selected_playlist.destroyGraph();
    showPlaylists();
  });
  $('#feature > button').each((i, element) => {
    $(element).click(() => {
      currentFeature = element.id;
      selected_playlist.sort(currentFeature, currentPeak, currentInverse);
      selected_playlist.graph();
    });
  });
  $('#peak > button').each((i, element) => {
    $(element).click(() => {
      currentPeak = parseInt(element.id);
      selected_playlist.sort(currentFeature, currentPeak, currentInverse);
      selected_playlist.graph();
    });
  });
  $('#inversion').click(() => {
    currentInverse = !currentInverse;
    selected_playlist.sort(currentFeature, currentPeak, currentInverse);
    selected_playlist.graph();
  });
  $('#reset').click(() => {
    selected_playlist.reset();
    selected_playlist.graph();
  });
  $('#create-playlist').click(() => {
    selected_playlist.create().then(response => {
      alert('New sorted playlist created!');
      selected_playlist.destroyGraph();
      showPlaylists();
    }).catch(error => alert(`Something went wrong. Error: ${error}`));
  });
  selected_playlist.graph();
}

// Shows the list of playlists
function showPlaylists() {
  document.body.innerHTML = `<h1>Select a playlist to sort</h1>`
  playlists.forEach(playlist => {
    document.body.innerHTML += `<div class="playlist-list-item" id="${playlist.id}">${playlist.name}</div>`
  });

  playlists.forEach(playlist => {
    $('#'+playlist.id).click(function() {
      // Figure out which Playlist the user was refering to
      for (var i = 0; i < playlists.length; i++) {
        if (playlists[i].id == this.id) {
          selected_playlist = playlists[i];
          if (selected_playlist.isLoaded) {
            showSelected();
          }
          else {
            selected_playlist.load().then(response => {
              showSelected();
            }).catch(error => console.log(error)); // Get all the songs for the selected playlist
          }
          break;
        }
      }
    });
  });
}

// Helper function used by main to get the Spotify access token
function get_params() {
  var params = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
  q = window.location.hash.substring(1);
  while (e = r.exec(q)) {
    params[e[1]] = decodeURIComponent(e[2]);
  }
  return params;
}

// This is the main start for the website. It looks for a Spotify access token.
// If one is found, then get a list of all the user's playlists
$(document).ready(main());
function main() {
  var params = get_params();
  if ('access_token' in params) { // Look for a Spotify access token
    access_token = params.access_token;
    // Get user's playlist and then show them
    get('me/playlists?limit=50').then(response => {
      playlists = [];
      response.items.forEach(item => playlists.push(new Playlist(item)));
      showPlaylists();
    }).catch(error => console.log(error));
    // Get user's ID
    get('me').then(response => user_id = response.id)
      .catch(error => console.log(error));
  }
  else if ('error' in params) {
    console.log("Error: no access token found");
  }
}
