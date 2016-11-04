var path = require("path")

module.exports = {
  context: path.resolve(__dirname, "lib"),
  entry: "./index",
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    libraryTarget: "commonjs2"
  },
  module: {
    loaders: [
      {
        test: /\.(svg|css)$/,
        loader: "file?name=[name].[ext]"
      }
    ]
  }
}
