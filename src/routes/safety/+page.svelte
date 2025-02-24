<script lang="ts">
import { page } from '$app/state';
import Form, { type GetRenderedItems, type OnChange } from '$lib';
import { setContext } from 'svelte';
import { render } from './config.svelte';

const onChange: OnChange = (values, inputInfo, methods) => {
	formData = values;
};

let submitAttempted = $state(false);
let formData = $state();
let valid = $state();
</script>

<div class="mx-auto flex h-[100svh] w-1/4 max-w-[60rem] min-w-96 flex-col overflow-hidden px-4">
	<h1 class="pb-2 text-center text-2xl font-semibold md:text-4xl">Safety Form</h1>
	<div class="grow overflow-hidden rounded border border-gray-500 shadow">
		<div class=" max-h-full overflow-auto p-4">
			<Form
				classes={{
					selected: 'bg-blue-500',
					header: 'text-2xl tracking-tight border-b pb-1 mx-auto',
					border: 'border-gray-500',
					block: 'flex-wrap pr-4 pb-4 border-gray-100',
					invalid: 'bg-red-700/75',
					label: 'text-xl pb-1 font-semibold'
				}}
				bind:valid
				{onChange}
				getRenderedItems={render}
			></Form>
		</div>
	</div>
	<div class="flex py-2 lg:py-4">
		<button
			class="h-8 w-full rounded bg-blue-500 text-white transition-transform duration-75 hover:scale-105 active:scale-95"
		>
			Submit</button
		>
	</div>
</div>
