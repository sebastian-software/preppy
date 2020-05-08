import execa from "execa"

export async function preppy(options) {
  const { cwd, ...rest } = options
  const opts = { cwd }

  const args = Object.keys(rest).map((key) => `--${key}=${rest[key]}`)

  const result = await execa("../../bin/preppy", args, opts)
  return result.exitCode
}
