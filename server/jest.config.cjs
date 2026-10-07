module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",

  setupFiles: [
    "<rootDir>/test/setup-env.ts",
  ],

  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },

  collectCoverageFrom: [
    "src/**/*.(t|j)s",
  ],

  coverageDirectory: "coverage",
  testEnvironment: "node",

  maxWorkers: 1,
  testTimeout: 30000,
};