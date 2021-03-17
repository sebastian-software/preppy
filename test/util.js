import execa from "execa"

export function preppy(options) {
  const { cwd, ...rest } = options
  const opts = { cwd }

  const args = Object.keys(rest).map((key) => `--${key}=${rest[key]}`)

  return execa("../../bin/preppy", args, opts)
}
