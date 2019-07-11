/* eslint-disable no-console */

import { resolve } from "path"

import findRoot from "find-root"
import updateNotifier from "update-notifier"

import { name, version } from "../package.json"

import parseCommandline from "./parseCommandline"

import main from "./index"

const command = parseCommandline()
const flags = command.flags

// Store app root inside flags
if (flags.root) {
  flags.root = resolve(flags.root)
} else {
  flags.root = findRoot(process.cwd())
}

// Cleanup shorthands from flags
delete flags.v
delete flags.q

if (flags.verbose) {
  console.log("Flags:", flags)
}

// Check whether there is something new available
updateNotifier({ pkg: { name, version } }).notify()

async function run() {
  // Call main method
  const result = await main(flags)

  if (!flags.watch) {
    // Only check exit code in non-watch mode
    if (!result.successful) {
      process.exit(1)
    }

    process.exit(0)
  }
}

run()
