var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require("./webpack.config");

// config
config.entry.app = config.entry.app.concat([
  "webpack-dev-server/client?http://0.0.0.0:3000",
  "webpack/hot/only-dev-server"
]);
config.plugins = (config.plugins || []).concat([
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
]);
config.devtool = "source-map";

// start server
new WebpackDevServer(webpack(config), {
  publicPath: "/" + config.output.publicPath,
  historyApiFallback: true
}).listen(3000, '0.0.0.0', function (err, result) {
  if (err) {
    console.log(err);
  }
  console.log('Listening at 0.0.0.0:3000');
});
