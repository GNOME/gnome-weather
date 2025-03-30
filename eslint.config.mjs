import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat"
import { globalIgnores } from "eslint/config"


export default tseslint.config(
    globalIgnores([
        ".fenv/**",
        ".flatpak/**",
        "_build/**",
        "types/**",
        "gi-types/**",
        "eslint.config.mjs",
        "prettier.config.js",
        "*.doap"
    ]),
    eslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.recommendedTypeChecked,
    prettier,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            }
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                  "args": "all",
                  "argsIgnorePattern": "^_",
                  "caughtErrors": "all",
                  "caughtErrorsIgnorePattern": "^_",
                  "destructuredArrayIgnorePattern": "^_",
                  "varsIgnorePattern": "^_",
                  "ignoreRestSiblings": true
                }
            ],
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/explicit-member-accessibility": "error"
        }
    }
)