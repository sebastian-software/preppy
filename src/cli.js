/* eslint-disable no-console */

import root from "app-root-path"
import { resolve } from "path"

import parseCommandline from "./parseCommandline"
import main from "./index"

const command = parseCommandline()
const flags = command.flags

// Store app root inside flags
if (flags.root) {
  flags.root = resolve(flags.root)
} else {
  flags.root = root.toString()
}

// Cleanup shorthands from flags
delete flags.v
delete flags.q
delete flags.m

// Call main method
main(flags)
