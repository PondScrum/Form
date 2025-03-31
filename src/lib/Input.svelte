<script lang="ts">
import type { HTMLInputTypeAttribute, ChangeEventHandler } from 'svelte/elements';
import { tooltip, createSingletonTooltip, type TooltipParams } from './tooltip.svelte';
import { getContext, onDestroy, onMount, tick, untrack } from 'svelte';
// import Textarea from './Textarea.svelte';
// import CONF from '$config';
import { scale } from 'svelte/transition';
import { on } from 'svelte/events';

const indexToHeader = (s) => s;

const tooltipSide = getContext('tooltipSide') || 'right';
let {
	disabled = false,
	onlyValue = false,
	additionalEvents = {},
	initialValue,
	inputType,
	valueChanged,
	backgroundColor,
	options,
	cls,
	id,
	noHeight = false,
	useResultBG = true,
	tabindex = 0,
	mount,
	readonly = false,
	tooltipDelay,
	selected,
	classes,
	input
}: Props = $props();

const { singleton_tooltip, singleton } =
	inputType.split('_')[0] === 'inlineselect' &&
	createSingletonTooltip(
		'input' + id,
		{
			hideOnClick: false,
			allowHTML: true,
			placement: 'bottom',
			trigger: 'mouseenter',
			delay: [400, 150],
			popperOptions: {
				strategy: 'fixed',
				modifiers: [
					{
						name: 'flip',
						options: {
							fallbackPlacements: ['bottom', 'right']
						}
					},
					{
						name: 'preventOverflow',
						options: {
							rootBoundary: 'scrollParent',
							altAxis: true,
							tether: false
						}
					}
				]
			}
		},
		() => {}
	);

interface Props<T extends boolean = false> {
	disabled?: boolean;
	onlyValue?: T;
	additionalEvents?: Record<string, (e: Event) => void>;
	initialValue: undefined | string;
	valueChanged: (
		value: string,
		focused: boolean
	) => T extends false ? FormValidationReturn<string> : string;
	inputType: HTMLInputTypeAttribute;
	backgroundColor: undefined | string;
	options?: Record<string, string>;
	cls: string;
	id: string;
	noHeight?: boolean;
	useResultBG?: boolean;
	tabindex?: number;
}

type PossibleInputs = HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
let tooltipContent: false | string = $state(false);
let resultBackgroundColor: string | false = $state(false);
let chosenBackgroundColor = $derived((useResultBG && resultBackgroundColor) || backgroundColor);
let isFocused: boolean = $state(false);

export function setValue(value: string) {
	if (inputType.split('_')[0] === 'inlineselect') {
		lastSelectVal = value;
	}
	handleResult(valueChanged(value, false), document.getElementById(id) as PossibleInputs);
}
export function focus() {
	if (isFocused) return;
	focusedFromOutside = true;
	document.getElementById(id).focus();
}

let combinedOnFocus;

let events = $state();

onMount(() => {
	const { onfocus, ...restEvents } = additionalEvents;
	const requiredEvents = {
		onfocus: (e: FocusEvent) => {
			if (isFocused) return;
			isFocused = true;
			causeInput(e.target as PossibleInputs);
			!focusedFromOutside && additionalEvents.onfocus && additionalEvents.onfocus(e, disabled);
			focusedFromOutside = false;
		},
		onblur,
		oninput,
		onmouseleave
	};

	const combineEvents = Object.fromEntries(
		Array.from(new Set([...Object.keys(restEvents), ...Object.keys(requiredEvents)])).map((k) => [
			k,
			(...args) => {
				requiredEvents[k] && requiredEvents[k](...args);
				restEvents[k] && restEvents[k](...args);
			}
		])
	);
	events = combineEvents;
});

function mounted(elem: PossibleInputs, customFN = null) {
	console.log(elem);
	if (mount) mount(setValue);
	if (inputType === 'inlineselect') {
		lastSelectVal = initialValue;
	}
	if (inputType === 'file') {
		handleFiles(initialValue || [], true);
		return;
	}
	if (onlyValue) {
		handleResult(initialValue, elem);
		return;
	}
	//tick
	handleResult(valueChanged(initialValue || '', isFocused), elem);
	customFN && customFN();
}
function causeInput(target: PossibleInputs) {
	handleResult(valueChanged(target.value, isFocused), target);
}

let isValid = $state(false);
function handleResult(result: string | FormValidationReturn<string>, target: PossibleInputs) {
	isValid = result.valid;
	const indexer = inputType == 'boolean' ? 'checked' : 'value';
	if (onlyValue) {
		target[indexer] = result as string;
		return;
	}
	result = result as FormValidationReturn<string>;
	target[indexer] = result.value;
	resultBackgroundColor = result.background_color;
	tooltipContent = result.tooltip;
}

const oninput: ChangeEventHandler<PossibleInputs> = (e) => {
	//if (disabled) { could cause issues with existing usages
	// e.target.value = initialValue;
	// return;
	//}

	if (!e.target) return;
	const target = e.target as HTMLInputElement;
	const res = valueChanged(target.value, isFocused);
	if (isFocused) {
		handleResult(res, target);
	}
};

let tooltipShown = $state();
const niceHTML = (c) => c && `<h1 class="text-base capitalize tracking-tight">${c}</h1>`;
const wasLastTooltipShowing = () => $state.snapshot(untrack(() => tooltipShown));

let hideTT = $state(false);
export function hideTooltip(v) {
	hideTT = v;
	if (!v && tooltipContent) {
		tippy.show();
	}
	v && (tooltipShown = false);
}

export const elemId = id;
let tippy = $state();
let tooltipParams = () => ({
	id,
	onCreate: (e) => {
		tippy = e;
	},
	disabled: onlyValue,
	content: niceHTML(tooltipContent),
	trigger: 'manual',
	hide: hideTT,
	focused: isFocused,
	placement: tooltipSide,
	allowHTML: true,
	delay: tooltipDelay,
	duration: [wasLastTooltipShowing() ? 0 : 75, 0],
	animation: 'scale-subtle',
	inertia: false,
	popperOptions: {
		strategy: 'fixed',
		modifiers: [
			{
				name: 'flip',
				options: {
					fallbackPlacements: ['bottom', 'right']
				}
			}
			// {
			// 	name: 'preventOverflow',
			// 	options: {
			// 		altAxis: true,
			// 		tether: false
			// 	}
			// }
		]
	}
});

export const onblur = (e: FocusEvent) => {
	tooltipShown = false;
	if (e.defaultPrevented) return;
	focusedFromOutside = false;
	isFocused = false;
	causeInput(e.target as PossibleInputs);
};
const onmouseleave = () => {
	tooltipShown = false;
};

let focusedFromOutside = $state(false);
let lastSelectVal = $state();
let files = $state([]);
let fileRef = $state();
let loading = $state(false);

function removeFile(name) {
	handleFiles(
		files.filter((e) => !(e.name === name)),
		true
	);
}
function handleFiles(newsestFiles, replace = false) {
	if (!Array.isArray(newsestFiles)) {
		console.trace();
		throw new Error('a');
	}
	fileRef.value = '';
	let res;
	if (replace) {
		files = newsestFiles;
		res = valueChanged(files.slice());
	} else {
		const newNames = newsestFiles.map((e) => e.name);
		files = (files || []).filter((e) => !newNames.includes(e.name));
		files = [...files, ...newsestFiles];
		res = valueChanged(files.slice(), false);
	}
	console.log(res, 'a');
	resultBackgroundColor = res.background_color;
	tooltipContent = res.tooltip;
}
</script>

{#if events}
	{#if inputType === 'select'}
		{#if options}
			<!-- cant spread events here since programatic value assignment on select only works with 'change' -->
			<select
				class:text-white={!isValid}
				tabindex={disabled ? -1 : tabindex}
				onchange={events.oninput}
				onblur={events.onblur}
				onfocus={events.onfocus}
				{disabled}
				{id}
				class="{cls} outline-none {chosenBackgroundColor}"
				use:mounted
				use:tooltip={tooltipParams}
			>
				{#each Object.entries(options) as [key, value]}
					<option value={key}>{value}</option>
				{/each}
			</select>
		{:else}
			<button {id} {...events} use:mounted class="{cls} {chosenBackgroundColor}"
				>{initialValue}</button
			>
		{/if}
		<!-- {:else if inputType === 'textarea'} -->
		<!-- 	<Textarea -->
		<!-- 		{noHeight} -->
		<!-- 		inputType -->
		<!-- 		{id} -->
		<!-- 		{setValue} -->
		<!-- 		{isFocused} -->
		<!-- 		{cls} -->
		<!-- 		{tooltipParams} -->
		<!-- 		onMount={mounted} -->
		<!-- 		backgroundColor={chosenBackgroundColor} -->
		<!-- 		{events} -->
		<!-- 	></Textarea> -->
	{:else if inputType === 'textarea'}
		<textarea
			{disabled}
			use:mounted
			use:tooltip={tooltipParams}
			{...events}
			rows="12"
			{id}
			class="border {classes.border} min-h-12 {cls} {chosenBackgroundColor}"
		></textarea>
	{:else if inputType === 'boolean'}
		<div class="flex h-full w-auto">
			<input
				use:mounted
				onclick={(e) => {
					if (disabled) {
						e.preventDefault();
						e.stopPropagation();
					}
					return;
				}}
				onchange={(e) => {
					const res = valueChanged(e.target.checked, isFocused);
					if (isFocused) {
						handleResult(res, target);
					}
				}}
				{id}
				tabindex={disabled ? -1 : tabindex}
				class="mx-auto h-7 w-7 accent-blue-500 outline-none"
				type="checkbox"
			/>
		</div>
	{:else if inputType.split('_')[0] === 'inlineselect' && options}
		{@const tooltipType = Boolean(inputType.split('_')[1])}
		<div
			{id}
			use:tooltip={tooltipParams}
			use:mounted={() => (lastSelectVal = initialValue)}
			onclick={(e) => {
				if (e.target.id.split('-')[0] === 'inlineselect') {
					const i = e.target.id.split('-').slice(-1)[0];
					const oppositeIndex = i === '0' ? 1 : 0;
				}
			}}
			class="flex w-min text-nowrap"
		>
			<div
				class="flex justify-end border {classes.border}  divide-x overflow-hidden rounded {classes.divide} "
			>
				<!-- fix this class:text-white, conflicting with chosenbackgroundcolor -->
				{#each Object.entries(options) as [choice, displayChoice], i}
					<button
						tabindex={disabled ? -1 : tabindex}
						{disabled}
						id={id + '-' + i}
						class={{
							'text-white': (!isValid && !lastSelectVal) || lastSelectVal === choice,
							[classes.selected]: lastSelectVal === choice,
							[cls]: true,
							[chosenBackgroundColor]: true
						}}
						onmouseleave={singleton.enable}
						onmousedown={singleton.disable}
						onclick={(e) => {
							if (disabled) return;
							lastSelectVal = choice;
							handleResult(valueChanged(choice, isFocused), {});
						}}
					>
						<!-- <p>{indexToHeader(tooltipType ? choice : displayChoice)}</p> -->
						{#key lastSelectVal != choice}
							<p
								class="my-auto h-min capitalize"
								use:singleton_tooltip={() => ({
									id: choice,
									content: tooltipType && niceHTML(displayChoice)
								})}
								in:scale={{ duration: choice === lastSelectVal && 175, opacity: 0.98, start: 0.95 }}
							>
								{indexToHeader(tooltipType ? choice : displayChoice)}
							</p>
						{/key}
					</button>
				{/each}
			</div>
		</div>
	{:else if inputType === 'file'}
		<div use:mounted class="relative h-24 grow">
			<span class="absolute top-0 z-10 h-full w-full overflow-hidden">
				<div class="flex h-full max-w-full overflow-hidden">
					<div
						class="flex-col {loading &&
							'animate-pulse'} flex h-full w-min justify-between py-1 text-nowrap"
					>
						<div class="relative flex">
							<span
								use:tooltip={tooltipParams}
								class=" h-min w-full rounded border border-blue-400 bg-blue-500 px-1 text-center font-semibold text-nowrap text-white"
							>
								Upload
								<!-- {loading ? 'Loading...' : 'Upload'} -->
							</span>
							<div class="absolute top-0 z-10 h-full w-full opacity-0">
								<input
									bind:this={fileRef}
									class={{ ['top-0  h-full  w-full']: true }}
									multiple={true}
									onchange={async (e) => {
										if (loading) return;
										loading = true;
										function getb64(file) {
											return new Promise((r) => {
												const reader = new FileReader();
												let res;
												reader.onload = (e) =>
													r({
														name: file.name,
														data: e.target.result
													});
												reader.readAsDataURL(file);
											});
										}
										const res = await Promise.all(
											Object.values(e.target.files).map((e) => getb64(e))
										);
										handleFiles(res);
										loading = false;
										console.log(files);
									}}
									type="file"
								/>
							</div>
						</div>
						<span
							onclick={() => !loading && handleFiles([], true)}
							class="h-min rounded border border-red-500 bg-red-500 px-1 text-center font-semibold text-nowrap text-white"
						>
							Clear All
						</span>
					</div>
					<div class="grow overflow-hidden px-2">
						<div
							class="flex max-h-full min-h-full w-auto max-w-full min-w-[75%] flex-col overflow-auto border-y border-gray-300"
						>
							{#if loading && files?.length === 0}
								<span class="w-full text-center"> Loading... </span>
							{/if}
							<div class="max-w-full overflow-x-hidden">
								{#each files as file}
									<div class="mr-2 flex w-full justify-between py-1">
										<span
											class="mx-1 my-auto h-min min-w-24 rounded border border-blue-200 bg-blue-100 px-1 font-light text-nowrap"
										>
											{file.name}
										</span>
										<span
											role="button"
											onclick={() => {
												if (loading) return;
												removeFile(file.name);
											}}
											class="mx-1 my-auto h-min cursor-pointer font-bold text-red-500">x</span
										>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</span>
			<div class="absolute top-0 h-full opacity-0">
				<!-- 	<input bind:this={fileRef} class={{ ['w-full  top-0  h-full']: true }} -->
				<!-- multiple={true} name='zz' onchange={e=>{files=e.target.files.map(e=>({name:e.name,data:};console.log(JSON.stringify(files));}} type="file"> -->
			</div>
		</div>
	{:else if readonly}
		<div class="flex {cls} px-1">
			<p class="my-auto h-min w-full text-lg select-all">
				{initialValue}
			</p>
		</div>
	{:else}
		<input
			class={{ 'text-white accent-white': !isValid, [cls]: true, [chosenBackgroundColor]: true }}
			{disabled}
			tabindex={disabled ? -1 : tabindex}
			{id}
			autocomplete="off"
			{...input.elementAttributes}
			{...events}
			type={inputType}
			use:mounted
			use:tooltip={tooltipParams}
		/>
	{/if}
{/if}

<style>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
	-webkit-appearance: none;
	margin: 0;
}

/* Firefox */
input[type='number'] {
	-moz-appearance: textfield;
}
</style>
