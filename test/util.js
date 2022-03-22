import path from "path"

import execa from "execa"

export function preppy(options) {
  const { cwd, ...rest } = options
  const opts = { cwd }

  const args = Object.keys(rest).map((key) => `--${key}=${rest[key]}`)

  return execa(path.resolve("./bin/preppy"), args, opts)
}
