class Playlist {
  constructor(json) {
    this.name = json.name; // Name of the playlist
    this.id = json.id; // ID of the playlist
    this.public = json.public;
    this.songs = []; // Array of songs in the playlist (unsorted)
    this.songsSorted = []; // Array of songs in the playlist (sorted)
    this.isLoaded = false; // Whether or not the playlist's songs
    this.isSorted = false; // Whether or not the playlist has been sorted
    this.sortFeature = null; // Which feature the current sorted array is based on
    this.shape = null; // Shape of the sorted playlist
    this.isInverted = false; // Whether or not the shape is inverted
    this.chart = null; // Chart.js object
  }

  // Loads all songs and their features
  // Returns: Promise
  load() {
    return new Promise((resolve, reject) => {
      // 1) Make request for playlist tracks
      get(`playlists/${this.id}/tracks`).then(response => {
        // 2) Push valid songs to Object's song array (original order)
        response.items.forEach(song => {
          if (song.is_local === false) {
            this.songs.push(new Song(song.track));
          }
        });
        // 3) Wait for all song features to be loaded
        Promise.all(this.songs.map(song => song.analyzed)).then(() => {
          this.isLoaded = true;
          resolve(response); // resolve(): loading was successful
        }).catch(error => reject(error)); // reject(): error loading song features
      }).catch(error => reject(error)); // reject(): error loading playlist's songs
    });
  }

  // Creates a new playlists and fills it with the sorted songs
  // Returns: Promise
  create() {
    return new Promise((resolve, reject) => {
      // 1) Make sure there is something to push
      if (!this.isSorted) {
        reject(`Playlist isn't sorted`); // reject(): no songs to add
        return;
      }
      // 2) Create playlist
      post(`users/${user_id}/playlists`, {"name": `${this.name} - ${this.sortFeature} ${this.shape} ${this.isInverted ? 'inverted' : ''}`,"public": this.public}).then(response => {
        // 3) Add sorted songs to playlist
        post(`playlists/${response.id}/tracks`, {uris: this.songsSorted.map(song => song.uri)}).then(response => {
          resolve(response); // resolve(): successful playlist creation
        }).catch(error => reject(error)); // reject(): error adding songs
      }).catch(error => reject(error)); // reject(): error creating playlist
    });
  }

  // Description: Sorts the songs based on three parameters:
  // Parameters:
  //    <string> feature: which aspect of the song the sorting is focused on ('energy', 'tempo', etc.)
  //    <int> peak: index [0,4] of where the highest feature value will appear
  //                a peak of 0 means the highest value will appear at the beginning
  //                a peak of 1 means the highest value will appear 25% into the playlist
  //                a peak of 2 means the highest value will appear at the center
  //                a peak of 3 means the highest value will appear 75% into the playlist
  //                a peak of 4 means the highest value will appear at the end
  //   <bool> inverse: flips the shape upside down--essentially turns the peak into a trough
  // Returns: array of sorted songs
  sort(feature='energy', peak=4, inverse=false) {
    const Q = 4; // Divides the interval into four quadrants
    let left = [], right = [];
    let songs = this.songs.slice(); // Copy original order
    // 1) For this algorithm to work, the songs must start in acsending order
    songs.sort((a, b) => a.features[feature] - b.features[feature]);
    // 2) Build left and right side based on where the bias is
    for (let i = 0; i < this.songs.length/Q; i++) {
      for (let j = 0; j < peak; j++) if(songs.length != 0) left.push(songs.shift());
      for (let j = 0; j < (Q-peak); j++) if(songs.length != 0) right.push(songs.shift());
    }
    // 3) Merge left and right side
    if (!inverse) this.songsSorted = left.concat(right.reverse()); // Default: peak is peak
    else this.songsSorted = left.reverse().concat(right); // Peak to trough
    // 4) Update state variables
    this.isSorted = true;
    this.sortFeature = feature;
    switch(peak) {
      case 0: this.shape = 'down'; break;
      case 1: this.shape = 'left skew'; break;
      case 2: this.shape = 'bell'; break;
      case 3: this.shape = 'right skew'; break;
      case 4: this.shape = 'up'; break;
    }
    this.isInverted = inverse;
    // 5) Return copy of the sorted songs
    return this.songsSorted.slice();
  }

  // Resets all the state variables (reverts the graph to the original playlist order)
  reset() {
    this.sortedSongs = [];
    this.isSorted = false;
    this.sortFeature = null; // Which feature the current sorted array is based on
    this.shape = null;
    this.isInverted = false;
  }

  // Constructs and returns the dataset objects for Chart.js
  getDatasets() {
    // 1) Variable initialization
    let songs = (this.isSorted) ? this.songsSorted.slice() : this.songs.slice();
    const opacity = '60';
    const features = {
      'acousticness':'#FFCD56',
      'danceability':'#9966FF',
      'energy':'#36A2EB',
      'tempo':'#FF6384',
      'mood':'#4BC0C0'
    };
    let tempoScale = Math.max(...songs.map(song => song.tempo)); // We want tempo to be in the 0-1 range for graphing
    let datasets = [];
    // 2) Construct objects
    Object.keys(features).forEach(feature => {
      let data = songs.map(song => (feature === 'tempo') ? song[feature]/tempoScale : song[feature]); // Scale tempo down
      let color = (feature === this.sortFeature) ? features[feature] : features[feature]+opacity; // Add opacity if not the selected feature
      datasets.push({
        label: feature,
        data: data,
        backgroundColor: color,
        borderColor: color,
        pointHoverBackgroundColor: features[feature],
        pointHoverBorderColor: features[feature],
        fill: false
      });
    });
    return datasets;
  }

  // Creates or updates a Chart.js object
  graph() {
    let songs = (this.isSorted) ? this.songsSorted.slice() : this.songs.slice();
    // Determine if we want to create a whole new chart or just update an existing
    if (this.chart === null) { // Create new Chart.js
      this.chart = new Chart($("#chart"), {
        type: 'line',
        data: {
          labels: songs.map(song => song.name),
          datasets: this.getDatasets(),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          title: {
            display: true,
            text: `${this.name}`
          },
          tooltips: TOOLTIPS, // Bad practice, but the options config is whack so for now it's in config.js
          scales: SCALES // Same bad practive
        }
      });
    } else { // Update existing Chart.js
      // Update name
      if (this.isSorted)
        this.chart.options.title.text = `${this.name} - ${this.sortFeature} ${this.shape} ${this.isInverted ? 'inverted' : ''}`;
      else
        this.chart.options.title.text = `${this.name}`;
      this.chart.data.labels = songs.map(song => song.name); // Update song labels
      // Update datasets
      this.getDatasets().forEach((dataset, i) => {
        this.chart.data.datasets[i].data = dataset.data;
        this.chart.data.datasets[i].backgroundColor = dataset.backgroundColor;
        this.chart.data.datasets[i].borderColor = dataset.borderColor;
      });
      this.chart.update(); // 'Push' the updates
    }
  }

  // Destroy Chart.js graph
  destroyGraph() {
    this.reset();
    this.chart.destroy();
    this.chart = null;
  }
}
