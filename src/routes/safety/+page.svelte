<script lang="ts">
import { page } from '$app/state';
import Form, { type GetRenderedItems, type OnChange } from '$lib';
import { setContext, tick } from 'svelte';
import { getValidationChange, onscroll, render, setValidationLevel } from './config.svelte';
import tippy from 'tippy.js';

const onChange: OnChange = (values, inputInfo, methods) => {
	formData = values;
};

let submitAttempted = $state(false);
let formData = $state();
let valid = $state();

async function submit() {
	setValidationLevel('high');
	await tick(); //todo: fix requirements for 2 ticks here
	await tick();
	if (!valid) return;

	await new Promise((r) => {
		setTimeout(r, 2000);
	});
}

let loading = $state(false);
</script>

<div
	class=" mx-auto flex h-[100svh] max-w-[60rem] flex-col overflow-hidden border-x border-gray-500 px-2 shadow-2xl md:w-3/4 md:px-4 lg:w-1/2 xl:w-1/3"
>
	<h1 class="top-0 z-100 px-4 pb-2 text-center text-2xl font-bold md:text-3xl">Safety Form</h1>
	<div id="bound" class="grow overflow-hidden border-y border-gray-500">
		<div {onscroll} class=" max-h-full overflow-auto p-4">
			<Form
				globalKey={getValidationChange()}
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
	<div class="relative flex py-2 lg:py-4">
		<button
			onclick={async () => {
				if (loading) return;
				loading = true;
				await submit();
				loading = false;
			}}
			class="h-8 w-full rounded border border-blue-600/40 bg-blue-500 text-white transition-transform duration-75 hover:scale-105 active:scale-95"
		>
			{loading ? 'Submitting...' : 'Submit'}</button
		>
	</div>
</div>
