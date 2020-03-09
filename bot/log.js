const moment = require('moment')

module.exports = function (...msg) {
  console.log(`[${moment().format('HH:mm:ss')}]`, ...msg)
}
