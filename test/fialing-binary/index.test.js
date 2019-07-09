/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"
import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src/index"

const lazyRead = pify(readFile)
const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Multi Binary from ESNext with failing binary", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  const value = await preppy({
    root: __dirname,
    quiet: true,
    exec: true
  })

  expect(value.successful).toBe(false)
  expect(value.exitCodes).toMatchSnapshot()
})
