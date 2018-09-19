import pify from "pify"
import { exec } from "child_process"
import { readFile } from "fs"
import rimraf from "rimraf"

import pkg from "../../package.json"

const versionString = `preppy v${pkg.version}`

const lazyExec = pify(exec)
const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

test("Publish Test File", async () => {
  await lazyDelete("./test/lib")

  await lazyExec(
    "node ./bin/preppy --input-lib ./test/src/index.js --output-folder ./test/lib"
  )

  const cjs = await lazyRead("./test/lib/index.cjs.js", "utf8")
  expect(cjs.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const esm = await lazyRead("./test/lib/index.esm.js", "utf8")
  expect(esm.replace(versionString, "VERSION_STRING")).toMatchSnapshot()
})
