import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'zk/index': 'src/zk/index.ts',
    'contracts/index': 'src/contracts/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  bundle: true,
  external: [
    'ethers',
    'viem',
    '@noble/hashes',
    '@noble/curves',
  ],
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
}); 