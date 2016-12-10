import createHelper from "./createLatestConfig"

const additionalPresets = [
  "react"
]

const additionalPlugins = [
  // Optimization: hoist JSX that never changes out of render()
  "transform-react-constant-elements",

  // Optimization: wrap propTypes into environment checks
  "transform-react-remove-prop-types"
]

export default function createReactConfig() {
  return {
    classic: createHelper(false, additionalPresets, additionalPlugins),
    modern: createHelper(true, additionalPresets, additionalPlugins)
  }
}
