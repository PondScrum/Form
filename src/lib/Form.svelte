<script lang="ts">
import { onMount, tick, type Snippet } from 'svelte';
import { scale } from 'svelte/transition';

interface Props {
	valid: boolean;
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
	onJSError,
	getRenderedItems,
	onChange,
	initialValues,
	onError,
	onValid,
	onHide,
	onShow,
	classes = {}
}: Props = $props();

type Event = (index: string, value: string, allValues: Record<string, string>) => void;
const DEFAULT_INVALID_BG = 'bg-red-500';

type InputProps = { index: string, inputType: string } & AdditionalInputProps;

type AdditionalInputProps = {
	input: {
		class: string
	};
	label: {
		class: string;
		alias: string;
		html: string;
		hide?: true;

	}
	col?: true;
	readonly?: true
}



function handleValidationResponse(res: ReturnType<Validate>, currentValue = '') {
	const isValid = res.valid;
	return {
		value: isValid ? res.data : currentValue,
		tooltip: isValid ? '' : res.data,
		background_color: isValid ? '' : classes.invalid || DEFAULT_INVALID_BG
	};
}

import Input from './Input.svelte';

const defaultInputProps = {
	input: {
class: 'w-52 border h-8 rounded font-mono px-2'
	},
	label: {
		hide: false,
		alias: false,


	}
};

type DataToAssign = string;
type TooltipMessage = string;
type Validate = (
	value: string,
	focused: boolean
) => { valid: true; data: DataToAssign } | { valid: false; data: TooltipMessage };

type AdditionalProps = {};

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

const components = ['Text', 'Select', 'Date', 'InlineSelect', 'Col', 'Row', 'Boolean', 'Header','TextArea'];
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
// let hidden: string[] = $state([]);

let hidden = $state([]);

const match: Match = (value: string | boolean, block: Block | Block[]) => {
	let usedBool = typeof value === 'boolean';
	let blocks: Block[] = !Array.isArray(block) ? [block] : block;
	let values: string[];
	values = !Array.isArray(value) ? [value as string] : (value as string[]);
	const uid = values.join('');
	return (valueIndex: string) => {
		pivots[valueIndex] ??= {};
		pivots[valueIndex][uid] = blocks; // or block?
		const show = (index) => {
			hidden[index] && onShow(index);
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
		const hide = (index) => {
			if (!hidden[index]) {
				hidden[index] = true;
				//setInternalValue(index,'');
				onHide?.(index);
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
				const header = (headerText) => ({
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
	render();
});

type BaseBlock = { renderType: 'block'; props: InputProps; component: Snippet };
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

let validityMap = $state({});

function determineValidity() {
	let hidden = [];
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
		return handleValidationResponse(validationRes, value);
	} catch (e) {
		console.error(index);
		console.error(e);
		onJSError?.(e);
	}
}

let wrappedComponents: ProvidedComponents;

export function setInternalValue(index: string, value: string) {
	tick().then(() => {
		componentMap[index].setValue(value);
		//render();
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
let componentMap = $state({});
$inspect(componentMap);
const DEFAULT_LABEL_CLASS =
	'h-min min-w-36 pr-4 text-lg font-medium text-wrap capitalize lg:min-w-44 xl:text-2xl';
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
			{#if !hide|| alias}
				<label
					for={props.inputType}
					class={props.label.class || classes.label || DEFAULT_LABEL_CLASS}
				>
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
