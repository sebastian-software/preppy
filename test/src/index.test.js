import { promisify } from "util"
import { exec } from "child_process"
import { readFile } from "fs"
import rimraf from "rimraf"

import pkg from "../../package.json"

const versionString = "simplepublish v" + pkg.version

const lazyExec = promisify(exec)
const lazyRead = promisify(readFile)
const lazyDelete = promisify(rimraf)

test("Publish Test File", async () => {
  await lazyDelete("./test/lib")

  process.env.BABEL_ENV = "development"
  const { stdout, stderr } = await lazyExec("node ./bin/simplepublish --input ./test/src/index.js --output-folder ./test/lib")

  const cjs = await lazyRead("./test/lib/node.classic.commonjs.js", "utf8")
  expect(cjs.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const esm = await lazyRead("./test/lib/node.classic.esmodule.js", "utf8")
  expect(esm.replace(versionString, "VERSION_STRING")).toMatchSnapshot()
})
