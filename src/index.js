import { resolve } from "path"

import { rollup } from "rollup"
import buble from "rollup-plugin-buble"
import babel from "rollup-plugin-babel"
import nodeResolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import uglify from "rollup-plugin-uglify"

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

    var transpilationMode = "react"
    var transpilerConfig =
    {
      react: babel(
        {
          // Don't try to find .babelrc because we want to force this configuration.
          babelrc: false,

          exclude: "node_modules/**",
          presets:
          [
            [ "es2015", { modules: false } ],
            "es2016",
            "react"
          ],
          plugins:
          [
            // function x(a, b, c,) { }
            "babel-plugin-syntax-trailing-function-commas",

            // await fetch()
            "babel-plugin-syntax-async-functions",

            // class { handleClick = () => { } }
            "babel-plugin-transform-class-properties",

            // { ...todo, completed: true }
            "babel-plugin-transform-object-rest-spread",

            // function* () { yield 42; yield 43; }
            "babel-plugin-transform-regenerator",

            // Polyfills the runtime needed for async/await and generators
            ["babel-plugin-transform-runtime",
            {
              helpers: false,
              polyfill: false,
              regenerator: true
            }],

            // Optimization: hoist JSX that never changes out of render()
            "babel-plugin-transform-react-constant-elements"
          ]
        }),

      basic: buble()
    }


    return rollup({
      entry: entry,
      cache,
      onwarn: function(msg) {
        console.warn(msg)
      },
      external: fileMapper.isExternal,
      plugins:
      [
        transpilerConfig[transpilationMode],
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
