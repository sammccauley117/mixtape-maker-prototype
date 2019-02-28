class Song {
  constructor(json) {
    this.name = json.name;
    this.id = json.id;
    this.uri = json.uri;
    this.features = {};
    // Load features on creation
    this.analyzed = new Promise((resolve, reject) => {
      get(`audio-features/${this.id}`).then(response => {
        this.features['acousticness'] = response.acousticness;
        this.features['danceability'] = response.danceability;
        this.features['energy'] = response.energy;
        this.features['tempo'] = response.tempo;
        this.features['mood'] = response.valence;
        this.acousticness = response.acousticness;
        this.danceability = response.danceability;
        this.energy = response.energy;
        this.tempo = response.tempo;
        this.mood = response.valence;
        resolve();
      }).catch((error) => reject(error));
    });
  }
}
