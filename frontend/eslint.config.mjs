import rootConfig from "../eslint.config.mjs";

export default [...rootConfig, { ignores: [".next/**", "next-env.d.ts", "e2e/**"] }, { files: ["**/*.{ts,tsx}"], languageOptions: { globals: { window: "readonly", document: "readonly", localStorage: "readonly", fetch: "readonly", crypto: "readonly", URL: "readonly", URLSearchParams: "readonly", BeforeUnloadEvent: "readonly", navigator: "readonly", HTMLElement: "readonly" } } }];
