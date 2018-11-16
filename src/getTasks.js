import chalk from "chalk"
import toRegex from "to-regex"

/* eslint-disable complexity */
export default function getTasks({
  verbose,
  quiet,
  name,
  version,
  root,
  banner,
  entries,
  output,
  limit
}) {
  if (!output.main && !entries.binaries) {
    console.warn(chalk.red.bold("  - Missing `main` or `bin` entry in `package.json`!"))
  }
  const base = {
    verbose,
    quiet,
    root,
    name,
    version,
    banner
  }

  function matches() {
    return limit ? toRegex(limit, { contains: true }) : true
  }

  function check(fileName) {
    return fileName && matches(fileName)
  }

  const tasks = []
  if (entries.node) {
    if (check(output.main)) {
      tasks.push({
        ...base,
        input: entries.node,
        target: "node",
        format: "cjs",
        output: output.main
      })
    }
    if (check(output.module)) {
      tasks.push({
        ...base,
        input: entries.node,
        target: "node",
        format: "esm",
        output: output.module
      })
    }
  } else if (entries.library) {
    if (check(output.module)) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "esm",
        output: output.module
      })
    }
    if (check(output.main)) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "cjs",
        output: output.main
      })
    }
    if (!entries.browser) {
      if (check(output.umd)) {
        tasks.push({
          ...base,
          input: entries.library,
          target: "lib",
          format: "umd",
          output: output.umd
        })
      }
    }
    if (check(output.types)) {
      tasks.push({
        ...base,
        input: entries.library,
        target: "lib",
        format: "tsc",
        output: output.types
      })
    }
  }
  if (entries.browser) {
    if (check(output.browser)) {
      tasks.push({
        ...base,
        input: entries.browser,
        target: "browser",
        format: "esm",
        output: output.browser
      })
    }
    if (check(output.umd)) {
      tasks.push({
        ...base,
        input: entries.browser,
        target: "lib",
        format: "umd",
        output: output.umd
      })
    }
  }
  if (entries.binaries) {
    if (output.binaries) {
      for (const binaryName in output.binaries) {
        if (check(output.binaries[binaryName])) {
          tasks.push({
            ...base,
            input: entries.binaries[binaryName],
            target: "cli",
            format: "cjs",
            output: output.binaries[binaryName]
          })
        }
      }
    }
  }
  return tasks
}
