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
	tooltipDelay
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
	if (inputType === 'inlineselect') {
		lastSelectVal = initialValue;
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
	if (mount) mount(setValue);
	if (inputType === 'inlineselect') {
		lastSelectVal = initialValue;
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

function handleResult(result: string | FormValidationReturn<string>, target: PossibleInputs) {
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
let tooltipParams = () => {
	const res = {
		id,
		onShown: () => (tooltipShown = true),
		disabled: onlyValue,
		content: niceHTML(tooltipContent),
		trigger: 'mouseenter',
		focused: isFocused,
		placement: tooltipSide,
		allowHTML: true,
		delay: tooltipDelay,
		duration: wasLastTooltipShowing() ? 0 : 75,
		animation: 'scale-subtle',
		inertia: false,
		popperOptions: {
			strategy: 'fixed',
			modifiers: [
				{
					name: 'flip',
					options: {
						fallbackPlacements: ['bottom', 'top']
					}
				},
				{
					name: 'preventOverflow',
					options: {
						altAxis: true,
						tether: false
					}
				}
			]
		}
	};
	return res;
};

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
</script>

{#if events}
	{#if inputType === 'select'}
		{#if options}
			<!-- cant spread events here since programatic value assignment on select only works with 'change' -->
			<select
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
			use:tooltip={tooltipParams}
			use:mounted
			{...events}
			rows="12"
			{id}
			class=" {cls} {chosenBackgroundColor}"
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
			class="flex text-nowrap"
		>
			<div
				class="flex justify-end divide-x divide-zinc-500 overflow-hidden rounded border-gray-500 text-base lg:h-8"
			>
				<!-- fix this class:text-white, conflicting with chosenbackgroundcolor -->
				{#each Object.entries(options) as [choice, displayChoice], i}
					<button
						tabindex={disabled ? -1 : tabindex}
						{disabled}
						class:bg-blue-500={lastSelectVal === choice}
						class:text-white={lastSelectVal === choice || tooltipContent}
						id={id + '-' + i}
						class=" {cls} a {chosenBackgroundColor} "
						onmouseleave={singleton.enable}
						onmousedown={singleton.disable}
						onclick={(e) => {
							lastSelectVal = choice;
							handleResult(valueChanged(choice, isFocused), {});
						}}
					>
						<!-- <p>{indexToHeader(tooltipType ? choice : displayChoice)}</p> -->
						{#key lastSelectVal != choice}
							<p
								class="my-auto h-min"
								use:singleton_tooltip={() => ({
									id: choice,
									content: tooltipType && niceHTML(displayChoice)
								})}
								class:cursor-help={true}
								in:scale={{ duration: choice === lastSelectVal && 175, opacity: 0.98, start: 0.95 }}
							>
								{indexToHeader(tooltipType ? choice : displayChoice)}
							</p>
						{/key}
					</button>
				{/each}
			</div>
		</div>
	{:else if readonly}
		<div class="flex {cls} px-1">
			<p class="my-auto h-min w-full font-mono text-lg select-all">
				{initialValue}
			</p>
		</div>
	{:else}
		<input
			{disabled}
			tabindex={disabled ? -1 : tabindex}
			{id}
			autocomplete="off"
			{...events}
			type={inputType}
			class="{cls} {chosenBackgroundColor}"
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
