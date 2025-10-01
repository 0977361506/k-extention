const {merge} = require('webpack-merge')
const common = require('./webpack.common.js')

// Set NODE_ENV for development
process.env.NODE_ENV = 'development';

module.exports = merge(common, {
    mode: 'development',
    devtool: 'cheap-module-source-map',
})