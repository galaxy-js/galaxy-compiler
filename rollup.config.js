import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/index.js',
  acornInjectPlugins: [
    require('acorn-class-fields')
  ],
  plugins: [
    resolve()
  ],
  output: [
    {
      file: 'dist/galaxy-compiler.esm.js',
      format: 'es'
    },
    {
      file: 'dist/galaxy-compiler.js',
      name: 'GalaxyCompiler',
      format: 'umd'
    }
  ]
}
