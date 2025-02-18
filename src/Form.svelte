<script lang="ts">
import { onMount, tick } from 'svelte';
import { scale } from 'svelte/transition';

interface Props {
	invalidBG: string;
	onJSError: (e: Error) => void;
	getRenderedItems: (components: ProvidedComponents, allValues: Record<string, string>) => Block[];
	onChange: (
		allValues: Record<string, string>,
		lastInputInfo: { index: string; value: string; focused: boolean },
		methods: ProvidedMethods
	) => void;
	initialValues: Record<string, string>;
	onError: Event;
	onValid: Event;
	onHide: Event;
}
let {
	invalidBG,
	onJSError,
	getRenderedItems,
	preOnChange,
	onChange,
	title,
	initialValues,
	onError,
	onValid,
	onHide
}: Props = $props();

type Event = (index: string, value: string, allValues: Record<string, string>) => void;

function handleValidationResponse(res, currentValue = '') {
	const isValid = res.valid;
	return {
		value: isValid ? res.data : currentValue,
		tooltip: isValid ? '' : res.data,
		background_color: isValid ? '' : invalidBG
	};
}

import Input from './Input.svelte';

const defaultInputProps = {
	cls: 'w-52 border h-8 rounded font-mono px-2'
};

type DataToAssign = string;
type TooltipMessage = string;
type Validate = (
	value: string,
	focused: boolean
) => { valid: true; data: DataToAssign } | { valid: false; data: TooltipMessage };

type AdditionalProps = {};

type Block = { spec: string };
type SelectOptions = Record<string, string>;

type StandardInput = (index: string, validate: Validate, props: AdditionalProps) => Block;
type OptionInput = (
	index: string,
	validate: Validate,
	options: SelectOptions,
	props: AdditionalProps
) => Block;

type Match = (value: string, block: Block) => (index: string) => Block;

type Pivot = (index: string, ...Match: ReturnType<Match>[]) => Block;

type Group = (...blocks: Block[]) => Block;

const components = ['Text', 'Select', 'Date', 'InlineSelect', 'Col', 'Row', 'Boolean'];
type ProvidedComponents = {
	Text: StandardInput;
	Select: OptionInput;
	Date: StandardInput;
	InlineSelect: OptionInput;
	Boolean: StandardInput;
	Col: Block;
	Row: Block;
	Pivot: Pivot;
	Match: Match;
};
type ProvidedMethods = {
	setInternalValue: (index: string, valid: string) => void;
	setDisabled: (index: string, state: boolean) => void;
};

let pivots = $state({});
let allValues = $state(initialValues || {});
let renderedComponents = $state([]);

const match: Match = (value, block) => {
	let blocks: Block[] = !Array.isArray(block) ? [block] : block;
	let includesBool = false;
	let values: string[] = !Array.isArray(value) ? [value] : value;
	if (values.some((e) => typeof e === 'boolean')) includesBool = true;
	const uid = values.join('');
	return (valueIndex: string) => {
		pivots[valueIndex] ??= {};
		pivots[valueIndex][uid] = block;
		if (
			(includesBool && Boolean(allValues[valueIndex])) ||
			values
				.slice()
				.map((e) => e.toString().toLowerCase())
				.includes(allValues[valueIndex]?.toString()?.toLowerCase())
		) {
			return blocks;
		}

		const allBlocks = blocks
			.flat()
			.map((e) => collectBlocks(e))
			.flat()
			.filter((e) => e);
		allBlocks.forEach((b) => onHide(b.props.index));
	};
};

const pivot: Pivot = (valueIndex, ...matches) => {
	pivots[valueIndex] = {};
	const res = matches
		.map((e) => e(valueIndex))
		.filter((e) => e)
		.flat();

	const flatten = (items) => (items.every((e) => e.renderType) ? items : flatten(items.flat()));
	return flatten(res);
};

const buildTimeComponents = {
	Pivot: pivot,
	Match: match
};

const isGroup = (type: string) => ['Col', 'Row'].includes(type);

let getComponents;
async function render() {
	const components = getComponents(wrappedComponents, allValues);
	const toRender = components.filter((e) => e).flat();
	if (wrappedComponents) {
		await tick();
		setRendered(toRender);
	}
}

function setup() {
	getComponents = getRenderedItems;
	wrappedComponents = Object.assign(
		buildTimeComponents,
		Object.fromEntries(
			components.map((type) => {
				const block: Input & OptionInput = (index, validate, ...args) => {
					const props = args.slice(-1)[0] || {};
					const options = args[0];
					console.log(args);
					props.options = options;
					index = index.toLowerCase();
					const oc = (value, focused) => inputChanged(index, value, focused, validate, props);
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
							///...allProps[index]
						}
					};
					return res;
				};
				return [
					type,
					isGroup(type)
						? (...blocks) => {
								return { renderType: 'group', type, blocks };
							}
						: block
				];
			})
		)
	);
}

onMount(() => {
	setup();
	render();
	// tick().then(render);
});

function collectBlocks(obj, allBlocks = []) {
	if (!obj) return allBlocks;
	if (obj.blocks) {
		return obj.blocks.map((e) => collectBlocks(e)).flat();
	} else if (obj.renderType === 'block') {
		allBlocks = [...allBlocks, obj];
		return allBlocks;
	}
}

function inputChanged(index, value, focused, validate: Validate, props) {
	const readonly = props?.readonly;
	try {
		index = index.toLowerCase();
		const valid = { valid: true, data: value };
		let validationRes = valid;
		if (!readonly) {
			validationRes = validate(value, focused);
			// if (preOnChange) {
			// 	const { exportRes, relevantRes } = preOnChange({ index, value, exp, relevant });
			// 	exp = exportRes;
			// 	relevant = relevantRes;
			// }
		}

		const convertedResponse = handleValidationResponse(validationRes, value);

		allValues[index] = convertedResponse.value;

		const eventToRun = validationRes.valid ? onValid : onError;

		!readonly && eventToRun(index, validationRes.data, allValues);

		onChange(
			$state.snapshot(allValues),
			{ index, value: convertedResponse.value, focused },
			{ setInternalValue, setDisabled }
		);
		render();
		return handleValidationResponse(validationRes, value);
	} catch (e) {
		console.error(e);
		console.log(index);
		onJSError?.(e);
	}
}

let wrappedComponents;

export function setInternalValue(index, value) {
	tick().then(() => {
		forceRerender[index] ??= true;
		forceRerender[index] = !forceRerender[index];
		render();
	});

	const validate = (a) => ({ valid: true, data: a });
	return inputChanged(index, value, false, validate, {});
}

export function setDisabled(index, state) {
	disableMap[index] = state;
}

function setRendered(v) {
	renderedComponents = v.filter((e) => e);
}

let disableMap = $state({});
let forceRerender = $state({});

function indexToHeader(s) {
	return s;
}
</script>

{#snippet handleArr(items)}
	{#each items as renderSpec}
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
	{/each}
{/snippet}

<div class="relative h-min w-full" in:scale={{ duration: 100, opacity: 0.2, start: 0.98 }}>
	<div class="">
		{#if title}
			<h1 class="pb-3 text-center text-3xl font-bold underline">
				{title}
			</h1>
		{/if}
		<div class="">
			{@render handleArr(renderedComponents)}
		</div>
	</div>
</div>

{#snippet Block(Component, props)}
	<div in:scale={{ duration: 100, opacity: 0.98, start: 0.98 }} class="flex flex-row py-2 text-sm">
		<label
			for={props.inputType}
			class="/my-auto h-min min-w-36 pr-4 text-lg font-medium text-wrap lg:min-w-44 xl:text-2xl"
		>
			{indexToHeader(props?.index || '')}:
		</label>
		<div class="min-h-8">
			<div class="max-h-8 overflow-hidden">
				{#key forceRerender[props.index]}
					{props.options?.length}
					<Component {...props} disabled={props.readonly || disableMap[props.index]}></Component>
				{/key}
			</div>
		</div>
	</div>
{/snippet}

{#snippet Group(type, blocks)}
	<div class:border-t={true} class:flex-col={type === 'Col'} class="flex">
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
