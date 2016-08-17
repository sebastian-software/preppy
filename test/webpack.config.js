module.exports = {
    context: __dirname + "/lib",
    entry: "./index",
    target: "node",
    output: {
        path: __dirname + "/dist",
        filename: "bundle.js",
        libraryTarget: "commonjs2"
    },
    module: {
        loaders: [
            { test: /\.(svg|css)$/, loader: "file?name=[name].[ext]" }
        ]
    }
}
