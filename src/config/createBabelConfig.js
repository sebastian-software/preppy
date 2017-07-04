import babel from "rollup-plugin-babel"

const DEBUG_PRESETS = false

// Produce a classic ES5 output
const classicPreset = [ "babel-preset-edge", {
  target: "library",
  debug: DEBUG_PRESETS
}]

// Target ES2015 capable clients
const es2015Preset = [ "babel-preset-edge", {
  target: "es2015",
  debug: DEBUG_PRESETS
}]

// Target only modern engines. Even more modern than es2015.
const modernPreset = [ "babel-preset-edge", {
  target: "modern",
  debug: DEBUG_PRESETS
}]

/* eslint-disable max-params */
export function createHelper({ mode = "classic", minified = false, presets = [], plugins = [] }) {
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

      // All manually or minification related presets
      ...additionalPresets
    ],

    plugins: [
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
