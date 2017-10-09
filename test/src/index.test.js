import { promisify } from "util"
import { exec } from "child_process"
import { readFile } from "fs"

const lazyExec = promisify(exec)
const lazyRead = promisify(readFile)

test("Publish Test File", async () => {
  const { stdout, stderr } = await lazyExec("./bin/simplepublish --input test/src/index.js --output-folder test/lib")

  const cjs = await lazyRead("./test/lib/node.classic.commonjs.js", "utf8")
  expect(cjs).toMatchSnapshot()

  const esm = await lazyRead("./test/lib/node.classic.esmodule.js", "utf8")
  expect(esm).toMatchSnapshot()
})
