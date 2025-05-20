## sdk/ – additional agent guidance
* **Build / test command**: `npm run test && npm run lint`  
* **Output formats**: ESM + CJS via `tsup`; ship `.d.ts` type defs.  
* **Tree-shaking**: ensure side-effect-free modules.  
* **Linting**: follow Airbnb TS rules; run `eslint --max-warnings=0`.  
* **Versioning**: semantic-release with conventional commits.
