/* global __dirname */
import pify from "pify"
import { exec } from "child_process"
import { readFile } from "fs"
import rimraf from "rimraf"
import { resolve } from "path"

import pkg from "../../package.json"

const versionString = `preppy v${pkg.version}`

const lazyExec = pify(exec)
const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Typescript", async () => {
  await lazyDelete("./dist")

  console.log(await lazyExec(
    `node ./bin/preppy --input-lib ${resolve(__dirname, "index.tsx")} --output-folder ${resolve(__dirname, "dist")}`
  ))

  const cjs = await lazyRead(resolve(__dirname, "dist/index.cjs.js"), "utf8")
  expect(cjs.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const esm = await lazyRead(resolve(__dirname, "dist/index.esm.js"), "utf8")
  expect(esm.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const umd = await lazyRead(resolve(__dirname, "dist/index.umd.js"), "utf8")
  expect(umd.replace(versionString, "VERSION_STRING")).toMatchSnapshot()

  const indexDef = await lazyRead(resolve(__dirname, "dist/index.d.ts"), "utf8")
  expect(indexDef).toMatchSnapshot()

  const typesDef = await lazyRead(resolve(__dirname, "dist/types.d.ts"), "utf8")
  expect(typesDef).toMatchSnapshot()
})
