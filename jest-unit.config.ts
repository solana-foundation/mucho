import { Config } from "@jest/types";

const config: Partial<Config.InitialProjectOptions> = {
  resetMocks: true,
  restoreMocks: true,
  roots: ["<rootDir>/"],
  displayName: {
    color: "grey",
    name: "Unit Test",
  },
  transform: {
    "^.+\\.(ts|js)x?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2020",
        },
      },
    ],
  },
};

export default config;
