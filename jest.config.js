const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  verbose: true,
  
  // Map the @/ alias to src/ — this fixes "Cannot find module '@/lib/supabase/client'"
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Look for test files in test-scripts/ folder
  testMatch: ["<rootDir>/test-scripts/**/*.test.js"],
};

module.exports = createJestConfig(customJestConfig);