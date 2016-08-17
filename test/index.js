import classes1 from "./index.css"
console.log("Classes from CSS:", classes1)

import classes2 from "./alternate.sss"
console.log("Classes from SSS:", classes2)

import url from "./logo.svg"
console.log("Logo URL:", url)

var elem = document.createElement("div")
elem.className = classes1.root
document.body.appendChild(elem)
