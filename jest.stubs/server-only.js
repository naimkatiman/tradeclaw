// Stub for the `server-only` package under Jest. The real package throws
// when imported into a client bundle; under unit tests there is no bundle
// boundary, so we neutralize it.
module.exports = {};
