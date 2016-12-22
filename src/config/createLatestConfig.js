import babel from "rollup-plugin-babel"

const classicPreset = [ "latest", {
  es2015: {
    modules: false
  }
}]

const modernPreset = [ "babel-preset-env", {
  targets: {
    node: 6.5,
    electron: 1.4,
    browsers: [
      "Safari 10",
      "iOS 10",
      "Edge 14",
      "Chrome 53",
      "Firefox 50"
    ]
  },

  modules: false,
  debug: false,
  useBuiltIns: true
}]

export function createHelper(modern, minified, presets = [], plugins = []) {
  // This is effectively a split of "babel-preset-babili" where some plugins
  // are regarded as being useful in "normal" publishing while others are
  // too aggressive to lead to human readable code.
  const additionalPlugins = plugins.concat([
    "babel-plugin-minify-constant-folding",
    "babel-plugin-minify-dead-code-elimination",
    "babel-plugin-minify-flip-comparisons",
    "babel-plugin-minify-guarded-expressions",
    "babel-plugin-transform-member-expression-literals",
    "babel-plugin-transform-merge-sibling-variables",
    "babel-plugin-transform-property-literals",
    "babel-plugin-transform-regexp-constructors",
    "babel-plugin-transform-remove-undefined",
    "babel-plugin-transform-simplify-comparison-operators"
  ])

  if (minified) {
    additionalPlugins.push(
      "babel-plugin-minify-mangle-names",
      "babel-plugin-minify-simplify",
      "babel-plugin-minify-type-constructors",
      "babel-plugin-minify-numeric-literals",
      "babel-plugin-transform-minify-booleans"
    )
  }

  return babel({
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Allow usage of transform-runtime for referencing to a common library of polyfills
    runtimeHelpers: true,

    // Remove comments - these are often positioned on the wrong positon after transpiling anyway
    comments: minified === false,

    // Do not include superfluous whitespace characters and line terminators.
    // When set to "auto" compact is set to true on input sizes of >500KB.
    compact: minified === true ? true : "auto",

    // Should the output be minified (not printing last semicolons in blocks, printing literal string
    // values instead of escaped ones, stripping () from new when safe)
    minified,

    exclude: "node_modules/**",

    presets: [
      modern ? modernPreset : classicPreset,

      ...presets
    ],

    plugins: [
      // Strip flow type annotations from your output code.
      "transform-flow-strip-types",

      // Cherry-picks Lodash and recompose modules so you don’t have to.
      // https://www.npmjs.com/package/babel-plugin-lodash
      // https://github.com/acdlite/recompose#using-babel-lodash-plugin
      [ "lodash", { id: [ "lodash", "recompose" ] }],

      // class { handleClick = () => { } }
      "transform-class-properties",

      // { ...todo, completed: true }
      [ "transform-object-rest-spread", { useBuiltIns: true }],

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

      // All manually or minification related plugins
      ...additionalPlugins,

      // Improve some ES3 edge case to make code parseable by older clients
      // e.g. when using reserved words as keys like "catch"
      "transform-es3-property-literals",
      "transform-es3-member-expression-literals"
    ]
  })
}

export default function createLatestConfig(minified) {
  return {
    classic: createHelper(false, minified),
    modern: createHelper(true, minified)
  }
}
