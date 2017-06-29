import babel from "rollup-plugin-babel"

const commonEnvOptions = {
  modules: false,
  exclude: [ "transform-async-to-generator", "transform-regenerator" ],
  debug: false,
  useBuiltIns: true
}

// Babel-Preset-Env without targets effectively works like Babel-Preset-Latest
const classicPreset = [ "env", {
  ...commonEnvOptions
}]

const modernPreset = [ "env", {
  ...commonEnvOptions,

  targets: {
    node: "6.5",
    electron: "1.4",
    browsers: [
      "Safari 10",
      "iOS 10",
      "Edge 14",
      "Chrome 53",
      "Firefox 50"
    ]
  }
}]

// Follow the idea of https://angularjs.blogspot.de/2017/03/angular-400-now-available.html to offer
// kind of a standardized es2015 package which could be used in more modern browsers/clients. This
// is an alternative to our "modern" approach which is more oriented on specific browser development
// and requires some knowledge of the supported browser / nodejs range.
// The "modern" mode effectively keeps source code with arrow functions, classes, etc. better.
const es2015Preset = [ "es2015", {
  ...commonEnvOptions
}]

/* eslint-disable max-params */
export function createHelper({ mode = "classic", minified = false, runtime = true, presets = [], plugins = [] }) {
  // This is effectively a split of "babel-preset-babili" where some plugins
  // are regarded as being useful in "normal" publishing while others are
  // too aggressive to lead to human readable code.
  const additionalPlugins = plugins.concat([
    "babel-plugin-minify-dead-code-elimination",
    "babel-plugin-minify-flip-comparisons",
    "babel-plugin-minify-guarded-expressions",
    "babel-plugin-transform-member-expression-literals",
    "babel-plugin-transform-merge-sibling-variables",
    "babel-plugin-transform-regexp-constructors",
    "babel-plugin-transform-remove-undefined",
    "babel-plugin-transform-simplify-comparison-operators"
  ])

  const additionalPresets = presets.concat([
    // fill later
  ])

  if (minified) {
    additionalPresets.push("babel-preset-babili")
  }

  // Using centralized helpers but require generic Polyfills being loaded separately
  // e.g. via Babel-Runtime or via services like polyfill.io.
  // See also: https://github.com/babel/babel/tree/master/packages/babel-plugin-transform-runtime
  if (runtime) {
    additionalPlugins.push([ "transform-runtime", {
      // default
      helpers: true,

      // Changed from default. Regenerator is a rework of the code to replace generators.
      // These are pretty widely supported though.
      regenerator: false,

      // Changed from default. More efficient to use real polyfills.
      polyfill: false
    }])
  }

  return babel({
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Allow usage of transform-runtime for referencing to a common library of polyfills (Rollup setting)
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
      /* eslint-disable no-nested-ternary */
      mode === "modern" ? modernPreset :
      mode === "es2015" ? es2015Preset :
      classicPreset,

      ...additionalPresets
    ],

    plugins: [
      // Allow parsing of import() - this would be a good fit once Acorn/Rollup supports
      // processing import() correctly. It should be ignored for later processing in our opinion.
      // Currently it throws during parse by Acorn. For tracking of the issue see also:
      // - https://github.com/rollup/rollup/issues/1325
      // - https://tc39.github.io/proposal-dynamic-import/
      // "syntax-dynamic-import",
      //
      // This is our alternative appeoach for now which "protects" these imports from Rollup
      // for usage in Webpack later on. In detail it transpiles `import()` to `require.ensure` before
      // it reaches RollupJS.
      // https://github.com/airbnb/babel-plugin-dynamic-import-webpack
      "dynamic-import-webpack",

      // fast-async/await transformer Babel plugin
      // https://www.npmjs.com/package/fast-async
      "fast-async",

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

      // All manually or minification related plugins
      ...additionalPlugins,

      // Improve some ES3 edge case to make code parseable by older clients
      // e.g. when using reserved words as keys like "catch"
      "transform-es3-property-literals",
      "transform-es3-member-expression-literals"
    ]
  })
}

export default function createLatestConfig(options) {
  return {
    classic: createHelper({ ...options, mode: "classic" }),
    modern: createHelper({ ...options, mode: "modern" }),
    es2015: createHelper({ ...options, mode: "es2015" })
  }
}
