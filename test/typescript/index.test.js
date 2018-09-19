import pify from "pify"
import { exec } from "child_process"
import { readFile } from "fs"
import rimraf from "rimraf"

import pkg from "../../package.json"

jest.setTimeout(20000)

const versionString = `preppy v${pkg.version}`

const lazyExec = pify(exec)
const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

process.chdir(__dirname)

test("Publish Test File via Typescript", async () => {
  await lazyDelete("./dist")

  console.log(await lazyExec(
    "node ../../bin/preppy --input-lib ./index.tsx --output-folder ./dist"
  ))

  const cjs = await lazyRead("./dist/index.cjs.js", "utf8")
  expect(cjs.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const esm = await lazyRead("./dist/index.esm.js", "utf8")
  expect(esm.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const indexDef = await lazyRead("./dist/index.d.ts", "utf8")
  expect(indexDef).toMatchSnapshot()

  const typesDef = await lazyRead("./dist/types.d.ts", "utf8")
  expect(typesDef).toMatchSnapshot()
})
