import Queue from "p-queue"

async function helper() {
  console.log("Async helper")
}

async function main() {
  const queue = new Queue()
  queue.add(await helper())
}

main()
