import effectEslint from "@effect/eslint-plugin"
import { fixupPluginRules } from "@eslint/compat"
import tsParser from "@typescript-eslint/parser"
import tseslint from "typescript-eslint"
import functional from "eslint-plugin-functional"
import _import from "eslint-plugin-import"
import importX from "eslint-plugin-import-x"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys"

const doubleAssertionSelector = {
  selector: "TSAsExpression > TSAsExpression",
  message: "Double type assertion (as A as B) is banned. Decode at boundaries or restructure the type."
}

const dateBanSelectors = [{
  selector: "NewExpression[callee.name='Date'][arguments.length=0]",
  message: "Zero-argument new Date() is banned. Inject a clock or use Effect Clock."
}, {
  selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
  message: "Date.now() is banned. Inject a clock or use Effect Clock."
}]

const mockBanSelectors = [
  "fn",
  "clearAllMocks",
  "mock",
  "doMock",
  "unmock",
  "hoisted",
  "spyOn",
  "stubGlobal",
  "unstubAllGlobals",
  "mocked"
].map((member) => ({
  selector: `CallExpression[callee.object.name='vi'][callee.property.name='${member}']`,
  message: `vi.${member} is banned. Substitute behavior through explicit ports, fakes, or test harnesses.`
})).concat([{
  selector: "CallExpression[callee.object.name='jest'][callee.property.name='mock']",
  message: "jest.mock is banned. Substitute behavior through explicit ports, fakes, or test harnesses."
}])

const effectSchemaAliasBanSelectors = [{
  selector: "ImportDeclaration[source.value='effect'] ImportSpecifier[imported.name='Schema']:not([local.name='Schema'])",
  message: "Do not alias Schema imports from effect."
}, {
  selector: "ImportDeclaration[source.value='effect'] ImportNamespaceSpecifier",
  message: "Do not namespace-import effect. Import concrete modules directly."
}]

const sourceRestrictedSyntaxSelectors = [
  doubleAssertionSelector,
  ...dateBanSelectors,
  ...mockBanSelectors,
  ...effectSchemaAliasBanSelectors,
  {
    selector: "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
    message: "Type assertions are banned in source. Use Effect Schema decode or restructure the code."
  }
]

const testRestrictedSyntaxSelectors = [
  doubleAssertionSelector,
  ...dateBanSelectors,
  ...mockBanSelectors,
  ...effectSchemaAliasBanSelectors
]

const nonPropertyTestRestrictedSyntaxSelectors = [
  ...testRestrictedSyntaxSelectors,
  {
    selector: "ImportDeclaration[source.value='fast-check']",
    message: "Property-based tests must live in *.property.test.ts files."
  },
  {
    selector: "CallExpression[callee.object.name='fc'][callee.property.name='property']",
    message: "Move fc.property tests to a *.property.test.ts file."
  }
]

export default [
  {
    ignores: ["**/dist", "**/coverage", "**/node_modules", ".references/**"]
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "test/**/*.ts"]
  })),
  ...effectEslint.configs.dprint.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "test/**/*.ts"]
  })),
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    plugins: {
      functional,
      import: fixupPluginRules(_import),
      "simple-import-sort": simpleImportSort,
      "sort-destructure-keys": sortDestructureKeys
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.lint.json",
        tsconfigRootDir: import.meta.dirname
      }
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts"]
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      "@typescript-eslint/array-type": ["warn", { "default": "generic", "readonly": "generic" }],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "allow-as-parameter"
      }],
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "import/first": "error",
      "import/no-duplicates": "error",
      "import/newline-after-import": "off",
      "max-lines": ["error", { "max": 420, "skipBlankLines": true, "skipComments": true }],
      "no-magic-numbers": ["warn", {
        "enforceConst": true,
        "ignore": [0, 1, 1024],
        "ignoreArrayIndexes": true,
        "ignoreDefaultValues": true
      }],
      "no-console": ["warn", { "allow": ["error"] }],
      "no-restricted-syntax": ["error", ...sourceRestrictedSyntaxSelectors],
      "object-shorthand": "error",
      "simple-import-sort/imports": "off",
      "sort-destructure-keys/sort-destructure-keys": "error",
      ...functional.configs.recommended.rules,
      "functional/prefer-tacit": "error",
      "functional/immutable-data": "warn",
      "functional/no-let": "off",
      "functional/no-loop-statements": "off",
      "functional/no-throw-statements": "off",
      "functional/no-expression-statements": "off",
      "functional/functional-parameters": "off",
      "functional/no-classes": "off",
      "functional/no-class-inheritance": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-return-void": "off",
      "functional/prefer-immutable-types": "off",
      "@effect/dprint": ["error", {
        "config": {
          "indentWidth": 2,
          "lineWidth": 120,
          "semiColons": "asi",
          "quoteStyle": "alwaysDouble",
          "trailingCommas": "never"
        }
      }]
    }
  },
  {
    files: ["src/**/*.ts"],
    plugins: {
      "import-x": importX
    },
    settings: {
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts"]
      },
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      "import-x/no-unused-modules": ["error", { "unusedExports": true }]
    }
  },
  {
    files: ["test/**/*.test.ts", "test/**/*.spec.ts"],
    rules: {
      "functional/immutable-data": "off",
      "max-lines": "off",
      "no-magic-numbers": "off",
      "no-restricted-syntax": ["error", ...testRestrictedSyntaxSelectors]
    }
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "functional/immutable-data": "off"
    }
  },
  {
    files: ["test/**/*.test.ts", "test/**/*.spec.ts"],
    ignores: ["test/**/*.property.test.ts", "test/**/*.property.spec.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...nonPropertyTestRestrictedSyntaxSelectors]
    }
  }
]
