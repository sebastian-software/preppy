import { isAbsolute } from "path"

import babelPlugin from "rollup-plugin-babel"
import chalk from "chalk"
import cjsPlugin from "rollup-plugin-commonjs"
import executablePlugin from "rollup-plugin-executable"
import { advancedRun } from "rollup-plugin-advanced-run"
import jsonPlugin from "rollup-plugin-json"
import rebasePlugin from "rollup-plugin-rebase"
import replacePlugin from "rollup-plugin-replace"
import { terser as terserPlugin } from "rollup-plugin-terser"
import acornJsx from "acorn-jsx"

import progressPlugin from "./progressPlugin"
import jsxPlugin from "./jsxPlugin"
import typescriptResolvePlugin from "./typescriptResolvePlugin"

let cache

export function isRelative(dependency) {
  return (/^\./).exec(dependency)
}

export function formatJSON(json) {
  return JSON.stringify(json, null, 2).replace(/\\"/g, "")
}

/* eslint-disable complexity */
export default function getRollupInputOptions(options) {
  const { name, verbose, version, input, format, target, output } = options

  // This protected helper is required to make Preppy not optimizing itself here.
  const protectedEnv = process.env
  const env = protectedEnv.NODE_ENV

  const prefix = "process.env."
  const variables = {
    [`${prefix}BUNDLE_NAME`]: JSON.stringify(name),
    [`${prefix}BUNDLE_VERSION`]: JSON.stringify(version),
    [`${prefix}BUNDLE_TARGET`]: JSON.stringify(target),
    [`${prefix}BUNDLE_ENV`]: JSON.stringify(env)
  }

  // Only inject NODE_ENV for UMD (final browser bundles). For all other
  // cases this variable handling is better done in the final use case:
  // - live variable for CLI and NodeJS libraries
  // - bundle injection for Webpack bundling
  if (format === "umd" && env) {
    variables[`${prefix}NODE_ENV`] = JSON.stringify(env)
  }

  if (verbose) {
    console.log("Variables:", formatJSON(variables))
  }

  const extensions = [ ".js", ".jsx", ".es6", ".es", ".mjs", ".ts", ".tsx" ]

  return {
    input,
    cache,
    onwarn: (warning) => {
      console.warn(chalk.red(`  - ${warning.message} [${warning.code}]`))
    },
    external(dependency) {
      // Very simple externalization:
      // We exclude all files from NodeJS resolve basically which are not relative to current file.
      // We also bundle absolute paths, these are just an intermediate step in Rollup resolving files and
      // as we do not support resolving from node_modules (we never bundle these) we only hit this code
      // path for originally local dependencies.
      return !(dependency === input || isRelative(dependency) || isAbsolute(dependency))
    },
    acornInjectPlugins: [ acornJsx() ],
    plugins: [
      options.quiet ? null : progressPlugin(),
      options.exec ? advancedRun() : null,

      typescriptResolvePlugin(),
      rebasePlugin(),
      cjsPlugin({
        include: "node_modules/**",
        extensions
      }),
      replacePlugin(variables),
      jsonPlugin(),
      babelPlugin({
        // Rollup Setting: Prefer usage of a common library of helpers
        runtimeHelpers: format !== "umd",
        // We use envName to pass information about the build target and format to Babel
        envName: env ? `${env}-${target}-${format}` : `${target}-${format}`,
        // The Babel-Plugin is not using a pre-defined include, but builds up
        // its include list from the default extensions of Babel-Core.
        // Default Extensions: [".js", ".jsx", ".es6", ".es", ".mjs"]
        // We add TypeScript extensions here as well to be able to post-process
        // any TypeScript sources with Babel. This allows us for using presets
        // like "react" and plugins like "fast-async" with TypeScript as well.
        extensions,
        // Do not transpile external code
        // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
        exclude: [ "node_modules/**", "**/*.json" ]
      }),
      jsxPlugin(),
      (env === "production" && (format === "umd" || target === "cli")) ||
      (/\.min\./).exec(output) ?
        terserPlugin({
          toplevel: format === "esm" || format === "cjs",
          safari10: true,
          output: {
            /* eslint-disable-next-line @typescript-eslint/camelcase */
            ascii_only: true,
            semicolons: false
          }
        }) :
        null,
      target === "cli" ? executablePlugin() : null
    ].filter(Boolean)
  }
}
