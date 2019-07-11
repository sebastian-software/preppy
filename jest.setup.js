// Rewrite console.log/debug to a mock. This shouldn't be required to run in tests
// and makes test runner output much more calm and focused. We keep warn/error and
// other not so often used methods intact.
console.warn = jest.fn()
console.log = jest.fn()
console.debug = jest.fn()
