var path = require("path");
var webpack = require("webpack");

module.exports = {
  entry: {
    app: [ "babel-polyfill",  path.resolve(__dirname, "src/viewer/index.jsx") ]
  },
  output: {
    path: path.join(__dirname, "assets"),
    filename: "viewer.js",
    publicPath: "assets/"
  },
  module: {
    loaders: [
      // Set up jsx. This accepts js too thanks to RegExp
      {
        test: /\.jsx?$/,
        // Enable caching for improved performance during development
        // It uses default OS directory by default. If you need something
        // more custom, pass a path to it. I.e., babel?cacheDirectory=<path>
        loaders: ['babel'],
        // Parse only app files! Without this it will go through entire project.
        // In addition to being slow, that will most likely result in an error.
        include: [ path.join(__dirname, "src/viewer"), path.join(__dirname, "src/common") ]
      }
    ]
  },
  plugins: [
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        })
    ]
};
