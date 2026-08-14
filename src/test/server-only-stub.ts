/**
 * Test stub for the `server-only` package.
 *
 * That package deliberately throws when resolved through a client condition,
 * which is exactly what we want in a bundle and exactly wrong in a test runner.
 * Server modules are unit-tested in Node, so the guard is stubbed out here
 * rather than removed from the modules themselves — the real import stays, and
 * keeps protecting the real build.
 */
export {}
