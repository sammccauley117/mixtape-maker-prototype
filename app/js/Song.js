class Song {
  constructor(json) {
    this.name = json.name;
    this.id = json.id;
    this.uri = json.uri;
    this.features = {};
    this.isLoaded = false;
  }

  addFeatures(features) {
    if (features.id == this.id) {
      this.features['acousticness'] = features.acousticness;
      this.features['danceability'] = features.danceability;
      this.features['energy'] = features.energy;
      this.features['tempo'] = features.tempo;
      this.features['mood'] = features.valence;
      this.acousticness = features.acousticness;
      this.danceability = features.danceability;
      this.energy = features.energy;
      this.tempo = features.tempo;
      this.mood = features.valence;
      this.isLoaded = true;
    }
  }
}
