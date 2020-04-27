import { isAbsolute, relative } from "path"

import babelPlugin from "rollup-plugin-babel"
import builtinModules from "builtin-modules"
import chalk from "chalk"
import commonjsPlugin from "@rollup/plugin-commonjs"
import executablePlugin from "rollup-plugin-executable"
import { advancedRun } from "rollup-plugin-advanced-run"
import jsonPlugin from "@rollup/plugin-json"
import rebasePlugin from "rollup-plugin-rebase"
import nodeResolvePlugin from "@rollup/plugin-node-resolve"
import replacePlugin from "@rollup/plugin-replace"
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

function dependencyToPackageName(dep) {
  // short path
  if (!dep.includes("/")) {
    return dep
  }

  const isScoped = dep.startsWith("@")
  return dep.split("/").slice(0, isScoped ? 2 : 1).join("/")
}

function importerToPackageName(filepath) {
  if (filepath.endsWith("?commonjs-external")) {
    return filepath.slice(0, -18)
  }

  const CWD = process.cwd()

  const relpath = relative(CWD, filepath)

  // Local file path - simplified to "."
  if (!(/node_modules/).exec(relpath)) {
    return "."
  }

  const segments = relpath.split(/\\|\//)
  const packageName = segments[1]

  return packageName
}

function isVirtualRollupFile(filename) {
  return /\0/.exec(filename)
}

function shouldDependencyBeInlined(name, importer, deps, state, verbose) {
  const packageName = dependencyToPackageName(name)

  // If is still listed in normal (runtime) or peer dependencies then
  // we assume that the owner do not want to bundle it.
  if (deps.runtime.has(packageName) || deps.peer.has(packageName)) {
    if (!state.required.has(packageName)) {
      if (verbose) {
        console.log(`Local Package ${packageName} will be required at runtime!`)
      }
      state.required.add(packageName)
    }

    return false
  }

  // If the dependency is listed in development dependencies
  // then we assume that it will not be required anymore during runtime.
  // To make this possible we have to inline it.
  if (deps.development.has(packageName)) {
    if (!state.inlined.has(packageName)) {
      if (verbose) {
        console.log(`Local Package ${packageName} will be inlined into bundle.`)
      }
      state.inlined.add(packageName)
    }
    return true
  }

  // Continue processing virtual files (helper constructs in Rollup processing pipeline)
  if (isVirtualRollupFile(importer)) {
    return true
  }

  // If the package is not listed in any of the dependencies we assume
  // that it is some kind of globally available package in the destination
  // environment. We do not bundle these as well.
  const importerName = importerToPackageName(importer)

  if (importerName === ".") {
    if (!state.globalized.has(packageName)) {
      if (verbose) {
        console.log(`Global Package '${packageName}' will be required at runtime!`)
      }
      state.globalized.add(packageName)
    }
    return false
  }

  return true
}

const builtIns = new Set(builtinModules)

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

  const extensions = [ ".js", ".jsx", ".mjs", ".ts", ".tsx" ]
  const state = {
    globalized: new Set(),
    inlined: new Set(),
    required: new Set()
  }

  return {
    input,
    cache,
    onwarn: (warning) => {
      console.warn(chalk.red(`  - ${warning.message} [${warning.code}]`))
    },
    // Signature: (source, importer, false)
    external(dependency, importer) {
      // Very simple externalization:
      // We exclude all files from NodeJS resolve basically which are not relative to current file.
      // We also bundle absolute paths, these are just an intermediate step in Rollup resolving files and
      // as we do not support resolving from node_modules (we never bundle these) we only hit this code
      // path for originally local dependencies.
      const inlineDependency = dependency === input || isRelative(dependency) || isAbsolute(dependency)
      if (!inlineDependency && options.deep) {
        // Only mark dependencies as internal which are not built-in
        if (!builtIns.has(dependency)) {
          if (shouldDependencyBeInlined(dependency, importer, options.deps, state, verbose)) {
            return false
          }
        }
      }

      return !inlineDependency
    },
    acornInjectPlugins: [ acornJsx() ],
    plugins: [
      options.quiet ? null : progressPlugin({ watch: options.watch }),
      options.exec ? advancedRun() : null,

      typescriptResolvePlugin(),
      rebasePlugin(),
      options.deep ? nodeResolvePlugin() : null,
      commonjsPlugin(),
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
