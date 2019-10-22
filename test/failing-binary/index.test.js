/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import preppy from "../../src/index"

const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

function fixInterOSPaths(exitCodes) {
  return exitCodes.map((item) => ({
    ...item,
    command: item.command.replace("\\", "/")
  }))
}

test("Multi Binary from ESNext with failing binary", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  const value = await preppy({
    root: __dirname,
    quiet: true,
    exec: true
  })

  expect(value.successful).toBe(false)
  expect(fixInterOSPaths(value.exitCodes)).toMatchSnapshot()
})
