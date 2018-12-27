const moment = require('moment');
const BANDWIDTH_PERIOD = 86400;

function calculateBanwidth(prepBandwidthTime, bandwidth = 0, txSize = 0) {
  const diff = prepBandwidthTime ?
    moment().unix() - moment(prepBandwidthTime).unix() :
    BANDWIDTH_PERIOD;
  return Math.max(0, (BANDWIDTH_PERIOD - diff) / BANDWIDTH_PERIOD) * bandwidth + txSize;
}

module.exports = {
  calculateBanwidth
}