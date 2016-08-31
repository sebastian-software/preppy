import { resolve } from "path"

import { rollup } from "rollup"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import uglify from "rollup-plugin-uglify"
import relink from "rollup-plugin-relink"

import readPackage from "read-package-json"
import denodeify from "denodeify"
import { eachSeries } from "async"
import { camelCase } from "lodash"

import es2015buble from "./config/es2015buble"
import es2016loose from "./config/es2016loose"
import es2016 from "./config/es2016"
import react from "./config/react"
import stage2 from "./config/stage2"
import stage3 from "./config/stage3"

const scriptExtensions = [ ".js", ".jsx", ".es5", ".es6", ".es", ".json" ]

const transpilerConfig =
{
  es2015buble,
  es2016loose,
  es2016,
  react,
  stage2,
  stage3
}

var cache

denodeify(readPackage)(resolve("package.json")).then((pkg) =>
{
  // Read entry file from command line... fallback to typical default location
  var entry = process.argv[2] || "src/index.js"
  var banner = `/*! ${pkg.name} v${pkg.version} by ${pkg.author.name} */`
  var formats = pkg.browser ? [ "es", "cjs", "umd", "umd-min" ] : [ "es", "cjs" ]
  var deepBundle = false

  var moduleId = pkg.name
  var moduleName = camelCase(pkg.name)

  const outputFolder = process.argv[3] ? process.argv[3] : "lib"
  const outputFileMatrix = {
    "cjs": outputFolder ? `${outputFolder}/index.js` : pkg.main || null,
    "es": outputFolder ? `${outputFolder}/index.es.js` : pkg.module || pkg["jsnext:main"] || null,
    "umd": outputFolder ? `${outputFolder}/index.umd.js` : pkg.browser || null,
    "umd-min": outputFolder ? `${outputFolder}/index.umd.min.js` : pkg.browser.replace(".js", ".min.js") || null
  }

  eachSeries(formats, (format, callback) =>
  {
    console.log(`Bundling ${pkg.name} v${pkg.version} as ${format}...`)

    var fileFormat = format.split("-")[0]
    var fileMode = format.split("-")[1]

    var fileRelink = relink({outputFolder})

    var transpilationMode = "react"

    return rollup({
      entry: entry,
      cache,
      onwarn: (msg) => console.warn(msg),
      external: fileRelink.isExternal,
      plugins:
      [
        transpilerConfig[transpilationMode],
        deepBundle ? nodeResolve({
          module: true,
          jsnext: true,
          main: true,
          browser: fileFormat === "umd"
        }) : null,
        commonjs({
          include: "node_modules/**",
          extensions: scriptExtensions
        }),
        fileRelink,
        fileMode === "min" ? uglify() : null
      ].filter((plugin) => Boolean(plugin))
    })
    .then((bundle) =>
      bundle.write({
        format: fileFormat,
        moduleId,
        moduleName,
        banner,
        sourceMap: true,
        dest: outputFileMatrix[format]
      })
    )
    .then(() =>
      callback(null)
    )
    .catch((err) =>
    {
      console.error(err)
      callback(`Error during bundling ${format}: ${err}`)
    })
  })
})
.catch((err) =>
{
  console.error("Error while building: ", err)
  process.exit(1)
})
