import babel from "rollup-plugin-babel"
import envPreset from "babel-preset-env"
import objRestSpreadPlugin from "babel-plugin-transform-object-rest-spread"
import fastAsyncPlugin from "babel-plugin-fast-async"

const DEBUG_PRESETS = false

/* eslint-disable max-params */
export function createHelper({ mode = "classic", presets = [], plugins = [] }) {
  const excludePlugins = [
    "transform-regenerator",
    "transform-async-to-generator"
  ]

  if (mode === "es2015") {
    excludePlugins.push(
      "transform-es2015-template-literals",
      "transform-es2015-literals",
      "transform-es2015-function-name",
      "transform-es2015-arrow-functions",
      "transform-es2015-block-scoped-functions",
      "transform-es2015-classes",
      "transform-es2015-object-super",
      "transform-es2015-shorthand-properties",
      "transform-es2015-duplicate-keys",
      "transform-es2015-computed-properties",
      "transform-es2015-for-of",
      "transform-es2015-sticky-regex",
      "transform-es2015-unicode-regex",
      "check-es2015-constants",
      "transform-es2015-spread",
      "transform-es2015-parameters",
      "transform-es2015-destructuring",
      "transform-es2015-block-scoping",
      "transform-es2015-typeof-symbol",
      "transform-es2015-modules-commonjs",
      "transform-es2015-modules-systemjs",
      "transform-es2015-modules-amd",
      "transform-es2015-modules-umd"
    )
  }

  const envPresetWithConfig = [ envPreset, {
    exclude: excludePlugins,
    useBuiltIns: true,
    loose: true,
    modules: false,
    targets: {
      node: "6.9.0"
    }
  }]

  const allPresets = [].concat(
    [
      envPresetWithConfig
    ],
    presets
  )

  const allPlugins = [].concat(
    [
      objRestSpreadPlugin,
      [
        fastAsyncPlugin, {
          useRuntimeModule: true
        }
      ]
    ],
    plugins
  )

  return babel({
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Rollup Setting: Allow usage of transform-runtime for referencing to a common library of polyfills
    runtimeHelpers: true,

    // Remove comments - these are often positioned on the wrong position after transpiling anyway
    comments: false,

    // Do not transpile external code
    // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
    exclude: [
      "node_modules/**",
      "**/*.json"
    ],

    presets: allPresets,
    plugins: allPlugins
  })
}

export default function createBabelConfig(options) {
  return {
    classic: createHelper({ ...options, mode: "classic" }),
    es2015: createHelper({ ...options, mode: "es2015" })
  }
}
