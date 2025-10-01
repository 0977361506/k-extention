const {merge} = require('webpack-merge')
const common = require('./webpack.common.js')

// Set NODE_ENV for production
process.env.NODE_ENV = 'production';

module.exports = merge(common, {
    mode: 'production',
})