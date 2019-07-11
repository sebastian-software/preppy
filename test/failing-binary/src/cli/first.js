process.stdout.write(">>>>>>>>>>>>>>>> FIRST")

setTimeout(() => {
  process.exit(1)
}, 1000);
