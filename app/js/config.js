// Chart options. Bad practice, but it's cleaner to keep it here for now
const TOOLTIPS = {
  mode: 'nearest',
  intersect: false,
  callbacks: {
    title: function(tooltipItem, data) {
      return data['labels'][tooltipItem[0]['index']];
    },
    label: () => '',
  }
}

const SCALES = {
  xAxes: [{
    display: true,
    scaleLabel: {
      display: true,
      labelString: 'Songs'
    },
    ticks: {
      display: false
    }
  }],
  yAxes: [{
    display: true,
    scaleLabel: {
      display: true,
      labelString: 'Features'
    },
    ticks: { min: 0, max: 1 }
  }]
}
