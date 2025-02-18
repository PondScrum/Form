import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json' with { type: 'json' };
console.log(pkg);
export default {
	input: 'src/Form.svelte',
	output: [
		{ file: pkg.module, format: 'es' },
		{ file: pkg.main, format: 'umd', name: 'Name' }
	],
	plugins: [svelte(), resolve()]
};
