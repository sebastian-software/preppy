import babel from "rollup-plugin-babel"

// Produce a classic ES5 output
const classicPreset = [ "babel-preset-edge", {
  target: "library",
  modules: false
}]

// Follow the idea of https://angularjs.blogspot.de/2017/03/angular-400-now-available.html to offer
// kind of a standardized es2015 package which could be used in more modern browsers/clients. This
// is an alternative to our "modern" approach which is more oriented on specific browser development
// and requires some knowledge of the supported browser / nodejs range.
// The "modern" mode effectively keeps source code with arrow functions, classes, etc. better.
const es2015Preset = [ "babel-preset-edge", {
  target: "es2015",
  modules: false
}]

// This preset is more abstract than `es2015Preset` and selects from quite a modern range
// of NodeJS and browser versions.
const modernPreset = [ "babel-preset-edge", {
  modules: false,
  target: {
    node: "6.9.0",
    electron: "1.4",
    browsers: [
      "Safari >= 10",
      "iOS >= 10",
      "Edge >= 14",
      "Chrome >= 53",
      "Firefox >= 50"
    ]
  }
}]

/* eslint-disable max-params */
export function createHelper({ mode = "classic", minified = false, runtime = true, presets = [], plugins = [] }) {
  const additionalPlugins = plugins.concat()
  const additionalPresets = presets.concat()

  if (minified) {
    additionalPresets.push("babili")
  } else {
    // Apply some basic compression also for normal non-minified builds. After all
    // it makes no sense to publish deadcode for example.
    additionalPresets.push([
      "babili", {
        booleans: false,
        deadcode: false,
        infinity: false,
        mangle: false,
        flipComparisons: false,
        replace: false,
        simplify: false
      }
    ])
  }

  let selectedPreset
  if (mode === "modern") {
    selectedPreset = modernPreset
  } else if (mode === "es2015") {
    selectedPreset = es2015Preset
  } else {
    selectedPreset = classicPreset
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

    // Do not transpile external code
    exclude: "node_modules/**",

    presets: [
      selectedPreset,

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

      // All manually or minification related plugins
      ...additionalPlugins
    ]
  })
}

export default function createBabelConfig(options) {
  return {
    classic: createHelper({ ...options, mode: "classic" }),
    es2015: createHelper({ ...options, mode: "es2015" }),
    modern: createHelper({ ...options, mode: "modern" })
  }
}
