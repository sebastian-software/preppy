import meow from "meow"

export default function parseCommandline() {
  return meow(
    `
  Usage
    $ preppy

  Options
    --input-lib        Input file for library target [default = auto]
    --input-cli        Input file for cli target [default = auto]
    --output-folder    Configure the output folder [default = auto]

    -m, --sourcemap    Create a source map file during processing
    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`,
    {
      flags: {
        inputLib: {
          default: null
        },

        inputCli: {
          default: null
        },

        outputFolder: {
          default: null
        },

        sourcemap: {
          alias: "m",
          default: true
        },

        verbose: {
          alias: "v",
          default: false
        },

        quiet: {
          alias: "q",
          default: false
        }
      }
    }
  )
}
