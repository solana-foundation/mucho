import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/index.ts",
  output: {
    dir: "bin",
    format: "esm",
    entryFileNames: "[name].mjs",
  },
  plugins: [
    commonjs(),
    nodeResolve({
      exportConditions: ["node"],
      // prevent using the deprecated punycode module
      preferBuiltins: (module) => module != "punycode",
    }),
    json(),
    typescript(),
    terser({
      format: {
        comments: "some",
        beautify: true,
      },
      compress: {
        drop_console: ["warn"],
      },
      mangle: false,
      module: true,
    }),
  ],
};
