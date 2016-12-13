import babel from "rollup-plugin-babel"

const classicPreset = [ "latest", {
  es2015: {
    modules: false
  }
}]

const modernPreset = [ "babel-preset-env", {
  targets: {
    node: 6,
    browsers: [
      "Safari 10",
      "iOS 10",
      "Edge 14",
      "Chrome 54",
      "ChromeAndroid 54",
      "Firefox 50",
      "FirefoxAndroid 50"
    ]
  },

  modules: false,
  debug: false,
  useBuiltIns: true
}]

export function createHelper(modern, minified, presets = [], plugins = []) {
  if (minified) {
    presets = presets.concat([
      [ "babili", {
        booleans: false,
        infinity: false
      }]
    ])
  }

  return babel({
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Allow usage of transform-runtime for referencing to a common library of polyfills
    runtimeHelpers: true,

    // Remove comments - these are often positioned on the wrong positon after transpiling anyway
    comments: false,

    // No need for preserve perfect formatting
    compact: true,

    // Should the output be minified (not printing last semicolons in blocks, printing literal string
    // values instead of escaped ones, stripping () from new when safe)
    minified,

    exclude: "node_modules/**",

    presets: [
      modern ? modernPreset : classicPreset,

      ...presets
    ],

    plugins: [
      // Improve some ES3 edge case to make code parseable by older clients
      // e.g. when using reserved words as keys like "catch"
      "transform-es3-property-literals",
      "transform-es3-member-expression-literals",

      // Using centralized helpers but require generic Polyfills being loaded separately
      // e.g. via Babel-Runtime or via services like polyfill.io.
      // See also: https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime
      [ "transform-runtime", {
        // default
        helpers: true,

        // default
        regenerator: true,

        // changed from default. More efficient to use real polyfills.
        polyfill: false
      }],

      // class { handleClick = () => { } }
      "transform-class-properties",

      // { ...todo, completed: true }
      [ "transform-object-rest-spread", { useBuiltIns: true }],

      // Eliminates unnecessary closures from your JavaScript in the name of performance
      // https://github.com/codemix/babel-plugin-closure-elimination
      "closure-elimination",

      // Strip flow type annotations from your output code.
      "transform-flow-strip-types",

      ...plugins
    ]
  })
}

export default function createLatestConfig(minified) {
  return {
    classic: createHelper(false, minified),
    modern: createHelper(true, minified)
  }
}
