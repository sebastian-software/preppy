import classes1 from "./index.css"
console.log("Imported from CSS:", classes1)

import classes2 from "./alternate.sss"
console.log("Imported from SSS:", classes2)

var elem = document.createElement("div")
elem.className = classes1.root
document.body.appendChild(elem)
