<script lang="ts">
import { onMount, tick } from 'svelte';
import { fade, slide } from 'svelte/transition';
import { page } from '$app/state';
import { getRenderedItems } from '$lib/form_spec';
import { getValidationState, setValidationLevel } from '$lib/validation.svelte';
import Form, { type AllValues, type OnChange } from '$lib/Form.svelte';
//import Form, { type AllValues, type OnChange } from '../../../../Form/src/lib';
import type { FormData } from '.';

const sluggedLocation = page.params.loc;

let submitAttempted = $state(false);
let loading = $state(false);
let clicked = $state(false);
let formData: FormData | undefined = $state();
let valid: boolean = $state(false);
let error: string | undefined = $state();
let successfulPost = $state(false);
let formRef: Form | undefined = $state();
let timeout: number | undefined = $state();
let location = $state({ allowed: 'awaiting', info: null });

async function postData() {
	const err = (c: string) => `An error occured: ${c} 
	Try again, if the issue persists, contact HMF Software Support`;
	try {
		const res = await fetch(import.meta.env.VITE_API_LINK, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ location, formData })
		});
		if (!res.ok) {
			error = err('API Response Code: ' + res.status);
		} else {
			return true;
		}
	} catch (e) {
		console.log(e);
		error = err('fetch error: ' + JSON.stringify(e));
	}
}

async function submit() {
	submitAttempted = true;
	setValidationLevel('high');
	await tick();
	if (!valid) return;
	if (!(await postData())) return;
	!import.meta.env.DEV && localStorage.removeItem('safetyForm');
	successfulPost = true;
}

const onChange: OnChange = (values) => {
	formData = values;
	localStorage.setItem('safetyForm', JSON.stringify(formData));
};

onMount(() => {
	navigator.geolocation.getCurrentPosition(
		(position: GeolocationPosition) => {
			location = {
				allowed: true,
				info: position
			};
		},
		() => {
			location = { allowed: false, info: null };
		}
	);
	tick().then(() => {
		sluggedLocation && formRef.setInternalValue('location', sluggedLocation.toUpperCase());
	});
});
</script>

<div
	class=" mx-auto flex h-[100svh] max-w-[60rem] flex-col overflow-hidden border-x border-gray-500 px-2 shadow-2xl md:w-3/4 md:px-4 lg:w-1/2 xl:w-1/3"
>
	{#if successfulPost}
		<div in:fade class="mx-auto my-auto h-min w-min">
			<h1 class="text-3xl font-semibold tracking-tight text-nowrap text-gray-800">
				Form Submitted
			</h1>
			<p
				class="text-center text-sm font-thin tracking-tighter text-gray-800 underline decoration-gray-300 decoration-[1px]"
			>
				You can close this window
			</p>
		</div>
	{:else}
		<h1 class="top-0 z-100 px-4 pb-2 text-center text-2xl font-bold md:text-3xl">Safety Form</h1>
		<div>
			{#if submitAttempted && !valid}
				<div in:slide={{ duration: 155 }} class="flex">
					<p class:animate-bounce={clicked} class="px-2 text-red-700/80">*</p>
					<p class="font-semibold transition-all" class:text-red-700={clicked}>Fields Required</p>
				</div>
			{/if}
		</div>
		{#if error}
			<div class="h-24 max-h-24">
				<div class="max-h-full overflow-auto">
					<p class="whitespace-pre text-red-700/80">
						{navigator.onLine ? '' : 'No internet connection detected'}
					</p>
					<p class="whitespace-pre text-red-700/80">{error}</p>
				</div>
			</div>
		{/if}
		<div id="bound" class="grow overflow-hidden border-y border-gray-500">
			<div {onscroll} class=" max-h-full overflow-auto p-4 pt-1">
				<Form
					onJSError={(e) => console.error(e)}
					events={{
						show: (e) => console.log('show', e),
						hide: (e) => console.log('hide', e),
						valid: (e) => console.log('valid', e),
						error: (e) => console.log('invalid', e)
					}}
					initialValues={JSON.parse(localStorage.getItem('safetyForm') || '{}')}
					bind:this={formRef}
					deleteOnHide={true}
					globalKey="{getValidationState()?.toString()}key:"
					bind:valid
					{onChange}
					{getRenderedItems}
				></Form>
			</div>
		</div>

		<div class="relative flex px-4 py-2 lg:py-4">
			<button
				onclick={async () => {
					clicked = true;
					clearTimeout(timeout);
					timeout = setTimeout(() => {
						clicked = false;
					}, 500);
					if (loading) return;
					loading = true;
					await submit();
					loading = false;
				}}
				class="h-7 w-full rounded border border-blue-600/40 bg-blue-500 font-semibold text-white transition-transform duration-75 hover:scale-105 active:scale-100"
			>
				{loading ? 'Submitting...' : 'Submit'}</button
			>
		</div>
	{/if}
</div>
