import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/index.js', 'service/service.js'],
  bundle: true,
  outdir: 'dist',
  entryNames: '[name]',
  format: 'iife',
  target: ['chrome69'],
  loader: {
    '.css': 'text'
  },
  banner: {
    js: '/* tizenbrew-miruro-tv */'
  },
  legalComments: 'none',
  sourcemap: true
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log('Watching src/ for changes...');
} else {
  await esbuild.build(options);
}
