import { createHelper } from "./createLatestConfig"

const additionalPresets = [
  "react"
]

const additionalPlugins = [
  // Transform JSX and prefer built-in methods
  [ "transform-react-jsx", { useBuiltIns: true }],

  // Optimization: hoist JSX that never changes out of render()
  "transform-react-constant-elements",

  // Optimization: wrap propTypes into environment checks
  "transform-react-remove-prop-types"
]

export default function createReactConfig(options) {
  return {
    classic: createHelper({ ...options, mode: "classic", presets: additionalPresets, plugins: additionalPlugins }),
    modern: createHelper({ ...options, mode: "modern", presets: additionalPresets, plugins: additionalPlugins }),
    es2015: createHelper({ ...options, mode: "es2015", presets: additionalPresets, plugins: additionalPlugins })
  }
}
