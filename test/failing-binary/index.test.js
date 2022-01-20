/* global __dirname */
import { readFile } from "fs"
import { resolve } from "path"

import pify from "pify"
import rimraf from "rimraf"

import { preppy } from "../util"

const lazyDelete = pify(rimraf)


test("Multi Binary from ESNext with failing binary", async () => {
  await lazyDelete(resolve(__dirname, "./bin"))

  let failed = false

  try {
    const value = await preppy({
      cwd: __dirname,
      exec: true
    })
  } catch (error) {
    failed = error.failed
  }

  expect(failed).toBe(true)
})
