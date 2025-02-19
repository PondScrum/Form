<script lang="ts">
import { onMount, tick, type Snippet } from 'svelte';
import { scale } from 'svelte/transition';

interface Props {
	valid: boolean;
	invalidBG: string;
	onJSError: (e: Error) => void;
	getRenderedItems: (components: ProvidedComponents, allValues: Record<string, string>) => Block[];
	onChange: (
		allValues: Record<string, string>,
		lastInputInfo: { index: string; value: string; focused: boolean },
		methods: ProvidedMethods
	) => void;
	initialValues: Record<string, string>;
	onError?: Event;
	onValid?: Event;
	onHide?: Event;
	onShow?: Event;
}
let {
	valid = $bindable(),
	invalidBG,
	onJSError,
	getRenderedItems,
	onChange,
	initialValues,
	onError,
	onValid,
	onHide,
	onShow
}: Props = $props();

type Event = (index: string, value: string, allValues: Record<string, string>) => void;

function handleValidationResponse(res: ReturnType<Validate>, currentValue = '') {
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

type InputProps = { index: string } & Record<string, any>;
type RenderType = 'group' | 'block';
type GroupType = 'row' | 'col';
type Block =
	| undefined
	| { renderType: 'block'; props: InputProps; component: Snippet }
	| { renderType: 'group'; type: GroupType; blocks: Block[] };
type SelectOptions = Record<string, string>;

type StandardInput = (index: string, validate: Validate, props: AdditionalProps) => Block;
type OptionInput = (
	index: string,
	validate: Validate,
	options: SelectOptions,
	props: AdditionalProps
) => Block;

type Match = (value: boolean | string, block: Block | Block[]) => (index: string) => Block[];

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

let pivots: Record<string, Record<string, Block[]>> = $state({});
let allValues = $state(initialValues || {});
let renderedComponents: Block[] = $state([]);
let hidden = $state([]);

const match: Match = (value: string | boolean, block: Block | Block[]) => {
	let usedBool = typeof value === 'boolean';
	let blocks: Block[] = !Array.isArray(block) ? [block] : block;
	let values: string[];
	values = !Array.isArray(value) ? [value as string] : (value as string[]);
	const uid = values.join('');
	return (valueIndex: string) => {
		const lastHidden = hidden.slice();
		hidden = [];
		pivots[valueIndex] ??= {};
		pivots[valueIndex][uid] = blocks; // or block?
		if (
			(usedBool && Boolean(allValues[valueIndex]) === value) ||
			values
				.slice()
				.map((e) => e.toString().toLowerCase())
				.includes(allValues[valueIndex]?.toString()?.toLowerCase())
		) {
			lastHidden.forEach((b) => onShow(b));
			return blocks;
		}
		const allBlocks = blocks
			.flat()
			.map((e) => collectBlocks(e))
			.flat()
			.filter((e) => e);
		hidden = allBlocks.slice().map((b) => b.props.index);
		console.log(valueIndex);
		allBlocks.forEach((b) =>
			!lastHidden.includes(b) ? onHide(b.props.index) : onShow(b.props.index)
		);
		return [];
	};
};

const pivot: Pivot = (valueIndex, ...matches) => {
	pivots[valueIndex] = {};
	const res = matches
		.map((e) => e(valueIndex))
		.filter((e) => e)
		.flat();

	const flatten = (items: any[]) =>
		items.every((e) => e.renderType) ? items : flatten(items.flat());
	return flatten(res);
};

const buildTimeComponents = {
	Pivot: pivot,
	Match: match
};

const isGroup = (type: string) => ['Col', 'Row'].includes(type);

async function render() {
	const components = getRenderedItems(wrappedComponents, allValues);
	const toRender = components.filter((e) => e).flat();
	if (wrappedComponents) {
		await tick();
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
						}
					};
					return res;
				};
				return [
					type,
					isGroup(type)
						? (...blocks: Block[]) => {
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
});

type BaseBlock = { renderType: 'block'; props: InputProps; component: Snippet };
function collectBlocks(obj: Block): BaseBlock[] {
	let allBlocks: BaseBlock[] = [];
	if (!obj) return allBlocks;
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

let validityMap = $state({});

function determineValidity() {
	const nonHiddenFields = Object.keys(allValues).filter((e) => !hidden.includes(e));
	return nonHiddenFields.every((k) => validityMap[k]);
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
		tick().then(() => {
			valid = determineValidity();
		});
		const convertedResponse = handleValidationResponse(validationRes, value);

		allValues[index] = convertedResponse.value;

		const eventToRun = validationRes.valid ? onValid : onError;

		!readonly && eventToRun && eventToRun(index, validationRes.data, allValues);

		onChange(
			$state.snapshot(allValues),
			{ index, value: convertedResponse.value, focused },
			{ setInternalValue, setDisabled }
		);
		render();
		console.log('render');
		return handleValidationResponse(validationRes, value);
	} catch (e) {
		console.error(e);
		console.log(index);
		onJSError?.(e);
	}
}

let wrappedComponents: ProvidedComponents;

export function setInternalValue(index: string, value: string) {
	tick().then(() => {
		forceRerender[index] ??= true;
		forceRerender[index] = !forceRerender[index];
		render();
	});

	const validate = (a: string) => ({ valid: true, data: a });
	return inputChanged(index, value, false, validate, { index }); //todo: figure out how to handle lack of props here
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
</script>

{JSON.stringify(hidden)}

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

{#snippet Block(Component: Snippet, props: InputProps)}
	<div in:scale={{ duration: 100, opacity: 0.98, start: 0.98 }} class="flex flex-row py-2 text-sm">
		<label
			for={props.inputType}
			class="/my-auto h-min min-w-36 pr-4 text-lg font-medium text-wrap capitalize lg:min-w-44 xl:text-2xl"
		>
			{indexToHeader(props?.index || '')}:
		</label>
		<div class="min-h-8">
			<div class="max-h-8 overflow-hidden">
				{#key forceRerender[props.index]}
					<Component {...props} disabled={props.readonly || disableMap[props.index]}></Component>
				{/key}
			</div>
		</div>
	</div>
{/snippet}

{#snippet Group(type: GroupType, blocks: Block[])}
	<div class:border-t={true} class:flex-col={type === 'col'} class="flex">
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
