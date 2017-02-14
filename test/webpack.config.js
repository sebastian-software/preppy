/* eslint-disable filenames/match-regex */
/* eslint-disable import/no-commonjs */
var path = require("path")

module.exports = {
  context: path.resolve(__dirname, "lib"),
  entry: "./node.modern.esmodule.js",
  target: "node",
  devtool: "source-map",
  stats: "errors-only",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    libraryTarget: "commonjs2"
  },
  module: {
    rules: [{
      test: /\.(svg|css)$/,
      use: {
        loader: "file-loader",
        options: {
          name: "[name].[ext]"
        }
      }
    }]
  }
}
