import createBubleConfig from "./config/createBubleConfig"
import createLatestConfig from "./config/createLatestConfig"
import createReactConfig from "./config/createReactConfig"

// We try to benefit from native features when possible and offer
// additional builds containing es2015 code for modern clients (Node v6, Chrome 50+, etc.)
// For bundling you have to use a tool which is aware of the additional package entries
// to access the additional exported library files though e.g. via 'main' fields in Webpack v2.
const transpilerConfig = {
  buble: createBubleConfig(),
  latest: createLatestConfig(),
  react: createReactConfig()
}

export default function getTranspilers(mode) {
  return transpilerConfig[mode]
}
