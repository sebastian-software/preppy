import babel from "rollup-plugin-babel"
import presetEdge from "babel-preset-edge"

const DEBUG_PRESETS = false

/* eslint-disable max-params */
export function createHelper({ mode = "classic", minified = false, presets = [], plugins = [], targetUnstable = false }) {
  const additionalPlugins = plugins.concat()
  const additionalPresets = presets.concat()

  let selectedPreset
  if (mode === "modern") {
    selectedPreset = [ presetEdge, {
      target: "modern",
      env: "production",
      compression: minified,
      debug: DEBUG_PRESETS
    }]
  } else if (mode === "es2015") {
    selectedPreset = [ presetEdge, {
      target: "es2015",
      env: "production",
      compression: minified,
      debug: DEBUG_PRESETS
    }]
  } else if (mode === "binary") {
    selectedPreset = [ presetEdge, {
      target: targetUnstable ? "node8" : "node",
      env: "production",
      compression: minified,
      modules: false,
      debug: DEBUG_PRESETS
    }]
  } else {
    selectedPreset = [ presetEdge, {
      target: "library",
      env: "production",
      compression: minified,
      debug: DEBUG_PRESETS
    }]
  }

  return babel({
    // Don't try to find .babelrc because we want to force this configuration.
    babelrc: false,

    // Rollup Setting: Allow usage of transform-runtime for referencing to a common library of polyfills
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
    // https://github.com/rollup/rollup-plugin-babel/issues/48#issuecomment-211025960
    exclude: [
      "node_modules/**",
      "**/*.json"
    ],

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
    modern: createHelper({ ...options, mode: "modern" }),
    binary: createHelper({ ...options, mode: "binary" })
  }
}
