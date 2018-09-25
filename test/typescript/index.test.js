/* global __dirname */
import { exec } from "child_process"
import { readFile } from "fs"
import { resolve } from "path"
import pify from "pify"
import rimraf from "rimraf"

const lazyExec = pify(exec)
const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Publish Test File via Typescript", async () => {
  process.chdir(__dirname)

  await lazyDelete("./dist")

  console.log(await lazyExec(`node ../../bin/preppy`))

  expect(
    await lazyRead(resolve(__dirname, "dist/index.cjs.js"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/index.esm.js"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/index.umd.js"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/index.d.ts"), "utf8")
  ).toMatchSnapshot()
  expect(
    await lazyRead(resolve(__dirname, "dist/types.d.ts"), "utf8")
  ).toMatchSnapshot()
})
