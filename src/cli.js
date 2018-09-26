/* eslint-disable immutable/no-mutation */
/* eslint-disable no-console */

import { get as getRoot } from "app-root-dir"

import parseCommandline from "./parseCommandline"
import bundleAll from "./index"

const command = parseCommandline()

const verbose = command.flags.verbose
if (verbose) {
  console.log("Flags:", command.flags)
}

bundleAll({
  root: getRoot(),
  ...command.flags
})
// Cleanup shorthands from flags
delete flags.v
delete flags.q
delete flags.m

