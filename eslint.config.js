import js from "@eslint/js";
import typescriptPlugin from "typescript-eslint";
import prettierPlugin from "eslint-config-prettier";

export default [
  js.configs.recommended,
  ...typescriptPlugin.configs.recommended,
  prettierPlugin,
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
  {
    // Apply to all files
    files: [
      "**/*.js",
      "**/*.ts",
      "**/*.tsx",
      "**/*.mts",
      "**/*.cts",
      "**/*.cjs",
    ],
    rules: {
      // custom rules here
    },
  },
  {
    // Special config for CJS files
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
      },
      sourceType: "commonjs",
    },
  },
];
