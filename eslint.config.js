import stylistic from "@stylistic/eslint-plugin"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/quotes": [ "error", "double" ],
      "@stylistic/semi": [ "error", "never" ],
      "@stylistic/object-curly-spacing": [ "error", "always" ],
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      "@stylistic/comma-dangle": [ "error", {
        arrays: "never",
        objects: "always",
        imports: "never",
        exports: "never",
        functions: "never",
      } ],
    },
  }
)
