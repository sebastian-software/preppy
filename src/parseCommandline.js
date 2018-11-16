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
    --output           Overrides output folder (and package.json entries) [auto]
    --watch            Keeps running and rebuilds on any change [false]
    --limit            Limits the current build scope to files matching [null]
    --sourcemap        Creates a source map file during processing [true]

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

        watch: {
          default: false
        },

        limit: {
          default: null
        },

        sourcemap: {
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
