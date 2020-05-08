/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyDelete = pify(rimraf)

jest.setTimeout(20000)

test("Multi Binary from ESNext with failing binary", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  let failed = false

  try {
    const value = await preppy({
      cwd: __dirname,
      exec: true
    })
  } catch (exept) {
    failed = exept.failed
  }

  expect(failed).toBe(true)
})
