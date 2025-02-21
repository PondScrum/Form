<script lang="ts">
import { onMount, setContext, tick, type Snippet } from 'svelte';
import { scale } from 'svelte/transition';
import type {
	BaseBlock,
	Block,
	GroupType,
	InputComponentPublicFns,
	InputProps,
	Pivot,
	Props,
	ProvidedComponents,
	Validate
} from './types/internal.ts';

let {
	deleteOnHide = false,
	valid = $bindable(),
	onJSError,
	getRenderedItems,
	onChange,
	events = {},
	initialValues,
	classes = {
		block: '',
		invalid: 'bg-red-500',
		label: 'h-min min-w-36 pr-4 text-lg font-medium text-wrap capitalize lg:min-w-44 xl:text-2xl'
	}
}: Props = $props();

//deleteOnHide prop should delete the values at allValue provide time, so it doesnt wipe for users, only on consumption

function handleValidationResponse(res: ReturnType<Validate>, currentValue = '') {
	const isValid = res.valid;
	return {
		value: isValid ? res.data : currentValue,
		tooltip: isValid ? '' : res.data,
		background_color: isValid ? '' : classes.invalid
	};
}

import Input from './Input.svelte';

const defaultInputProps = {
	input: {
		class: 'w-52 border h-8 rounded font-mono px-2'
	},
	label: {
		hide: false,
		alias: false
	}
};

const components = [
	'Text',
	'Select',
	'Date',
	'InlineSelect',
	'Col',
	'Row',
	'Boolean',
	'Header',
	'TextArea'
];

let pivots: Record<string, Record<string, Block[]>> = $state({});
let allValues = $state(initialValues || {});
let renderedComponents: Block[] = $state([]);
// let hidden: string[] = $state([]);

let hidden: Record<string, boolean> = $state({});

const match: Match = (value: string | boolean, block: Block | Block[]) => {
	let usedBool = typeof value === 'boolean';
	let blocks: Block[] = !Array.isArray(block) ? [block] : block;
	let values: string[];
	values = !Array.isArray(value) ? [value as string] : (value as string[]);
	const uid = values.join('');
	return (valueIndex: string) => {
		pivots[valueIndex] ??= {};
		pivots[valueIndex][uid] = blocks; // or block?
		const show = (index: string) => {
			hidden[index] && events.show?.(index);
			delete hidden[index];
		};
		const allBlocks = blocks
			.flat()
			.map((e) => collectBlocks(e))
			.flat()
			.filter((e) => e);
		if (
			(usedBool && Boolean(allValues[valueIndex]) === value) ||
			values
				.slice()
				.map((e) => e.toString().toLowerCase())
				.includes(allValues[valueIndex]?.toString()?.toLowerCase())
		) {
			allBlocks.forEach((b) => show(b.props.index));
			return blocks;
		}
		const hide = (index: string) => {
			if (!hidden[index]) {
				hidden[index] = true;
				// setInternalValue(index,'');
				events.hide?.(index);
				return index;
			}
		};
		allBlocks.forEach((e) => hide(e.props.index));
		return [];
	};
};

const pivot: Pivot = (valueIndex, ...matches) => {
	pivots[valueIndex] = {};
	const res = matches
		.map((e) => e(valueIndex))
		.filter((e) => e)
		.flat();

	const flatten = (items: Block[]) =>
		items.every((e) => e.renderType) ? items : flatten(items.flat());
	return flatten(res);
};

const buildTimeComponents = {
	Pivot: pivot,
	Match: match
};

const isGroup = (type: string) => ['Col', 'Row'].includes(type);

function render() {
	const components = getRenderedItems(wrappedComponents, allValues);
	const toRender = components.filter((e) => e).flat();
	if (wrappedComponents) {
		// await tick();
		setRendered(toRender);
	}
}

function setup() {
	wrappedComponents = Object.assign(
		buildTimeComponents,
		Object.fromEntries(
			components.map((type) => {
				const block: Input & OptionInput = (index, validate, ...args) => {
					const props = args.slice(-1)[0] || {};
					const options = args[0];
					props.options = options;
					index = index.toLowerCase();
					const oc = (value: string, focused: boolean) =>
						inputChanged(index, value, focused, validate, props);
					const res = {
						renderType: 'block',
						component: Input,
						props: {
							initialValue: allValues[index] || '',
							id: type.toLowerCase() + '-' + index,
							index,
							valueChanged: oc,
							inputType: type.toLowerCase(),
							...defaultInputProps,
							...props
						}
					};
					return res;
				};
				const header = (headerText: string) => ({
					renderType: 'block',
					component: 'header',
					props: { index: headerText }
				});
				return [
					type,
					isGroup(type)
						? (...blocks: Block[]) => {
								return { renderType: 'group', type, blocks };
							}
						: type === 'Header'
							? header
							: block
				];
			})
		)
	);
}

onMount(() => {
	setup();
	tick().then(render);
});

function collectBlocks(obj: Block): BaseBlock[] {
	let allBlocks: BaseBlock[] = [];
	if (!obj) return allBlocks;
	if (typeof obj !== 'object') return [];
	if ('blocks' in obj) {
		const res = obj.blocks.map((e) => collectBlocks(e)).flat() as {
			renderType: 'block';
			props: InputProps;
			component: Snippet;
		}[];
		return res;
	} else if (obj.renderType === 'block') {
		allBlocks = [...allBlocks, obj];
		return allBlocks as { renderType: 'block'; props: InputProps; component: Snippet }[];
	}
	return [];
}

let validityMap: Record<string, boolean> = $state({});

function determineValidity() {
	const nonHiddenFields = Object.keys(allValues).filter((e) => !(e in hidden));
	return nonHiddenFields.every((k) => validityMap[k]);
}

function provideAllValues() {
	const res = structuredClone($state.snapshot(allValues));
	if (deleteOnHide) {
		Object.keys(hidden).forEach((e) => {
			console.log(res, e);
			delete res[e];
		});
	}
	return res;
}

function inputChanged(
	index: string,
	value: string,
	focused: boolean,
	validate: Validate,
	props: InputProps
) {
	const readonly = props?.readonly;
	try {
		index = index.toLowerCase();
		if (props.key && value !== allValues[index]) {
			//this will def not work in cases of validation fn's returning override values
			tick().then(() =>
				tick().then(() => {
					forceRerender[props.key] ??= true;
					forceRerender[props.key] = !forceRerender[props.key];
				})
			);
		}
		let validationRes = { valid: true, data: value };
		if (!readonly) {
			validationRes = validate(value, focused);
			// if (preOnChange) {
			// 	const { exportRes, relevantRes } = preOnChange({ index, value, exp, relevant });
			// 	exp = exportRes;
			// 	relevant = relevantRes;
			// }
		}

		validityMap[index] = validationRes.valid;

		const convertedResponse = handleValidationResponse(validationRes, value);

		allValues[index] = convertedResponse.value;

		const eventToRun = events[validationRes.valid ? 'valid' : 'error'];
		!readonly && eventToRun && eventToRun(index, validationRes.data);
		tick().then(() => {
			render();
			onChange(
				provideAllValues(),
				{ index, value: convertedResponse.value, focused },
				{ setInternalValue, setDisabled }
			);
			valid = determineValidity();
		});

		return handleValidationResponse(validationRes, value);
	} catch (e) {
		console.error(index);
		console.error(e);
		if (e instanceof Error) onJSError?.(e);
	}
}

let wrappedComponents: ProvidedComponents;

export function setInternalValue(index: string, value: string) {
	tick().then(() => {
		componentMap[index].setValue(value);
	});
}

export function setDisabled(index: string, state: boolean) {
	disableMap[index] = state;
}

function setRendered(v: Block[]) {
	renderedComponents = v.filter((e) => e);
}

let disableMap: Record<string, boolean> = $state({});
let forceRerender: Record<string, boolean> = $state({});

function indexToHeader(str: string) {
	if (!str) {
		return str;
	}
	return str
		.toLowerCase()
		.split('_')
		.map((word) => {
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}
let componentMap: Record<string, InputComponentPublicFns> = $state({});
setContext('border', classes.border)
</script>

{#snippet handleArr(items: Block[])}
	{#each items as renderSpec}
		{#if renderSpec}
			{@const { renderType } = renderSpec}
			{#if renderType == 'group'}
				{@const { type, blocks } = renderSpec}
				{@render Group(type, blocks)}
			{:else}
				{@const { component, props } = renderSpec}
				{#key props.id}
					{@render Block(component, props)}
				{/key}
			{/if}
		{/if}
	{/each}
{/snippet}

<div class="relative h-min w-full" in:scale={{ duration: 100, opacity: 0.2, start: 0.98 }}>
	<div class="">
		<!-- {#if title} -->
		<!-- 	<h1 class="pb-3 text-center text-3xl font-bold underline"> -->
		<!-- 		{title} -->
		<!-- 	</h1> -->
		<!-- {/if} -->
		<div class="">
			{@render handleArr(renderedComponents)}
		</div>
	</div>
</div>

{#snippet Block(Component: Snippet | 'header', props: InputProps)}
	<div
		in:scale={{ duration: 100, opacity: 0.98, start: 0.98 }}
		class:flex-col={props.col}
		class="flex text-sm {props.block?.class || classes.block}"
	>
		{#if Component === 'header'}
			<p class="text-5xl font-medium">
				{props.index}
				<!-- {props.header} -->
			</p>
		{:else}
			{@const { hide, alias, html } = props.label}
			{#if !hide || alias}
				<label for={props.inputType} class={props.label.class || classes.label}>
					{#if html}
						{@html html}
					{:else}
						{indexToHeader(alias || props?.index || '')}
					{/if}
				</label>
			{/if}
			<div class="mx-auto my-auto max-h-24 overflow-hidden">
				{#key forceRerender[props.index]}
					<Component
						bind:this={componentMap[props.index]}
						cls={props.input.class}
						{...props}
						disabled={props.readonly || disableMap[props.index]}
					></Component>
				{/key}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet Group(type: GroupType, blocks: Block[])}
	<div class:border-t={classes.border} class:flex-col={type === 'col'} class="flex {classes.border}">
		{#each blocks as block, i (i)}
			{#if block}
				{#if block.renderType === 'block'}
					{#key forceRerender[block.props.index]}
						{@render Block(block.component, block.props)}
					{/key}
				{:else if Array.isArray(block)}
					{@render handleArr(block)}
				{:else}
					{@render Group(block.type, block.blocks)}
				{/if}
			{/if}
		{/each}
	</div>
{/snippet}
