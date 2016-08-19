import { resolve, extname, basename, dirname, join } from "path"

import { rollup } from "rollup"
import buble from "rollup-plugin-buble"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import uglify from "rollup-plugin-uglify"
import fse from "fs-extra"
import path from "path"

import readPackage from "read-package-json"
import denodeify from "denodeify"
import { eachSeries } from "async"
import { camelCase } from "lodash"

import loader from "./loader"

var readPackageAsync = denodeify(readPackage)

var cache

readPackageAsync(resolve("package.json")).then((pkg) =>
{
  // Read entry file from command line... fallback to typical default location
  var entry = process.argv[2] || "src/index.js"
  var banner = `/*! ${pkg.name} v${pkg.version} by ${pkg.author.name} */`
  var formats = [ "es", "cjs", "umd", "umd-min" ]
  var deepBundle = false

  var moduleId = pkg.name
  var moduleName = camelCase(pkg.name)

  const outputFolder = process.argv[3] ? process.argv[3] : "lib"
  const outputFileMatrix = {
    "cjs": outputFolder ? `${outputFolder}/index.js` : pkg.main || null,
    "es" : outputFolder ? `${outputFolder}/index.es.js` : pkg.module || pkg["jsnext:main"] || null,
    "umd": outputFolder ? `${outputFolder}/index.umd.js` : pkg.browser || null,
    "umd-min": outputFolder ? `${outputFolder}/index.umd.min.js` : pkg.browser.replace(".js", ".min.js") || null
  }

  eachSeries(formats, (format, callback) =>
  {
    console.log(`Bundling ${pkg.name} v${pkg.version} as ${format}...`)

    var fileFormat = format.split("-")[0]
    var fileMode = format.split("-")[1]

    var fileMapper = loader(outputFolder)

    return rollup({
      entry: entry,
      cache,
      onwarn: function(msg) {
        console.warn(msg)
      },
      external: fileMapper.isExternal,
      plugins:
      [
        buble(),
        deepBundle ? nodeResolve({ module: true, jsnext: true, main: true, browser: fileFormat === "umd" }) : null,
        commonjs({ include: "node_modules/**", extensions: [ '.js', '.jsx', '.es5', '.es6', '.es', '.json' ] }),
        fileMapper,
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
.catch(function(err)
{
  console.error("Error while building: ", err)
  process.exit(1)
})
