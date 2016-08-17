import classes from "./index.css"
console.log("CLASSES: ", classes)

var elem = document.createElement("div")
elem.className = classes.root
document.body.appendChild(elem)
