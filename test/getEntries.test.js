import { TestScheduler } from "jest"
import { expandExtensions } from "../src/getEntries"

test("Expand Extensions", () => {
  expect(expandExtensions(["src/index"])).toMatchSnapshot()
})
