import meow from "meow"

export default function parseCommandline() {
  return meow(
    `
  Usage
    $ preppy

  Options
    --entry-lib        Entry file for Library target [auto]
    --entry-browser    Entry file for Browser target [auto]
    --entry-node       Entry file for NodeJS target [auto]
    --entry-cli        Entry file for CLI target [auto]

    --root             The root folder of your project [auto]
    --output           Override output folder (and package.json entries) [auto]

    -m, --sourcemap    Create a source map file during processing [true]
    -v, --verbose      Verbose output mode [false]
    -q, --quiet        Quiet output mode [false]
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

        root: {
          default: null
        },

        output: {
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
