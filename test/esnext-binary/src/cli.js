import { snakeCase } from "lodash"

import { realWords } from "./common"

console.log("Magic:", snakeCase(realWords))
