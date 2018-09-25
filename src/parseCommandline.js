import meow from "meow"

export default function parseCommandline() {
  return meow(
    `
  Usage
    $ preppy

  Options
    --entry-lib        Entry file for Library target [default = auto]
    --entry-browser    Entry file for Browser target [default = auto]
    --entry-node       Entry file for NodeJS target [default = auto]
    --entry-cli        Entry file for CLI target [default = auto]

    --output-folder    Configure the output folder [default = auto]

    -m, --sourcemap    Create a source map file during processing
    -v, --verbose      Verbose output mode [default = false]
    -q, --quiet        Quiet output mode [default = false]
`,
    {
      flags: {
        entryLib: {
          default: null
        },

        entryBrowser: {
          default: null
        },

        entryNode: {
          default: null
        },

        entryCli: {
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
