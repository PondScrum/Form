<script lang="ts">
import 'tippy.js/animations/scale-subtle.css';
import 'tippy.js/dist/tippy.css';
import { onMount, setContext, tick, type Snippet } from 'svelte';
import { fade, scale, slide } from 'svelte/transition';
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
	readonly = false,
	deleteOnHide = false,
	valid = $bindable(),
	onJSError,
	getRenderedItems,
	onChange,
	events = {},
	initialValues,
	classes = {},
	globalKey,
	svelteTransition = slide
}: Props = $props();
const defaultClasses = {
						input: `font-mono font-normal h-8 rounded  px-2`,
						selected: 'bg-blue-500',
						header: 'text-2xl tracking-tight border-b pb-1 mx-auto',
						border: 'border-gray-500',
						divide:'divide-gray-500',
						group: 'border-gray-200  border-b pb-6',
						block: 'flex-wrap pt-4 pr-4  ',
						invalid: 'bg-red-700/75',
						label: 'text-xl pb-1 font-semibold'
					};

classes = Object.assign(defaultClasses, classes);

//deleteOnHide prop should delete the values at allValue provide time, so it doesnt wipe for users, only on consumption

// type DeepReadonly<T> = T extends Function ? T :
//   T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } :
//   T;

let allProps: Readonly<Record<string, any>> = $state({});

function handleValidationResponse(res: ReturnType<Validate>, currentValue = '') {
	const isValid = res.valid;
	return {
		valid: isValid,
		value: isValid ? res.data : currentValue,
		tooltip: isValid ? '' : res.data,
		background_color: isValid ? '' : classes.invalid
	};
}

import Input from './Input.svelte';


const components = [
	'Text',
	'Textarea',
	'Select',
	'Date',
	'Time',
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
let lastShown = $state({});

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
			tick().then(()=>(lastShown[index]=true))
			hidden[index] && events.show?.(index);
			delete hidden[index];
		};
		const allBlocks = blocks
			.flat()
			.map((e) => collectBlocks(e))
			.flat()
			.filter((e) => e);
		if (
			(usedBool && Boolean([valueIndex]) === value) ||
			values
				.slice()
				.map((e) => e.toString().toLowerCase())
				.includes(getValue(valueIndex)?.toString()?.toLowerCase())
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
const nestMap = $state({});

function cleanupEmptyObjects(obj) {
	const isObj = (o) => typeof o === 'object' && !Array.isArray(obj);
	if (!isObj(obj)) return;
	Object.keys(obj).forEach((k) => {
		if (!isObj(obj[k])) return;
		if (Object.keys(obj[k]).length === 0) {
			delete obj[k];
		} else {
			cleanupEmptyObjects(obj[k]);
		}
	});
	return obj;
}

const buildTimeComponents = {
	Pivot: pivot,
	Match: match,
	NestIndex: (...indexes) => {
		const finalIndex = indexes.slice(-1)[0];
		nestMap[indexes[0]] = indexes.join('_');
		return '_' + indexes.join('_');
	}
};
function isNested(index: string) {
	return index?.[0] === '_';
}

const isGroup = (type: string) => ['Col', 'Row'].includes(type);

function render() {
	const components = getRenderedItems(wrappedComponents, allValues);
	const toRender = components.filter((e) => e).flat();
	if (wrappedComponents) {
		setRendered(toRender);
	}
	// tick().then(() => {
	// 	lastShown = {};
	// });
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

					const nestRes = handleNested(index, allValues);
					allProps[index] = props;
					props.label??={}
					props.input??={}
					props.input.class??= classes.input + (classes.border && ' border ' + classes.border) || ''
					const res = {
						renderType: 'block',
						component: Input,
						props: {
							initialValue: nestRes.ref[nestRes.index] || '',
							id: type.toLowerCase() + '-' + index,
							index,
							valueChanged: oc,
							inputType: type.toLowerCase(),
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
	// const nonHiddenFields = Object.keys(allValues).filter((e) => !(e in hidden) && !(e in nestMap));
	// return nonHiddenFields.every((k) => validityMap[k]);

	const nonHiddenFields = Object.keys(validityMap).filter((e) => !(e in hidden));
	return nonHiddenFields.every((k) => validityMap[k]);
}

const DELETE_EMPTY_NESTED = true;
function provideAllValues() {
	const res = structuredClone($state.snapshot(allValues));
	if (deleteOnHide) {
		Object.keys(hidden).forEach((e) => {
			const nestRes = handleNested(e, res);
			const toDeleteFrom = nestRes.ref;
			delete toDeleteFrom[nestRes.index];
		});
	}
	cleanupEmptyObjects(res);
	return res;
}

function getValue(originalIndex) {
	const res = handleNested(originalIndex, allValues);
	return res.ref[res.index];
}
function handleNested(index, ref) {
	if (!isNested(index)) return { ref, index };
	const allIndexes = index.split('_').filter((e) => e);
	const rootIndex = allIndexes[0];
	const finalIndex = allIndexes.slice(-1)[0];
	allIndexes.slice(0, allIndexes.length - 1).forEach((e) => {
		ref[e] ??= {};
		ref = ref[e];
	});
	return { ref, index: finalIndex, rootIndex };
}

function inputChanged(
	index: string,
	value: string,
	focused: boolean,
	validate: Validate,
	props: InputProps
) {
	const RO = readonly || props?.readonly;
	const res = handleNested(index, allValues);
	const originalIndex = index;

	let dataRef = res.ref;
	index = res.index;
	try {
		index = index.toLowerCase();
		if (props.key && value !== allValues[index]) {
			//			this will def not work in cases of validation fn's returning override values
			tick().then(() =>
				tick().then(() => {
					forceRerender[props.key] ??= true;
					forceRerender[props.key] = !forceRerender[props.key];
				})
			);
		}
		let validationRes = { valid: true, data: value };
		if (!RO) {
			validationRes = validate(value, focused);
		}

		validityMap[originalIndex] = validationRes.valid;

		const convertedResponse = handleValidationResponse(validationRes, value);

		dataRef[index] = convertedResponse.value;
		//allValues[originalIndex]=convertedResponse.value;

		const eventToRun = events[validationRes.valid ? 'valid' : 'error'];
		!RO && eventToRun && eventToRun(index, validationRes.data);
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
		const component = componentMap[index];
		if (!component) {
			console.log(
				`Index does not exist as provided render item, force setting value: ${value} at index ${index}`
			);
			inputChanged(index, value, true, (a) => ({ valid: true, data: a }), {});
			return;
		}
		componentMap[index]?.setValue(value);
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
setContext('border', classes.border);
const yy = slide;
let mounted=$state(false)
onMount(()=>{
	mounted=true
})
</script>

<div class="relative h-min w-full" in:scale={{ duration: 100, opacity: 0.2, start: 0.98 }}>
	<div class="">
		<!-- {#if title} -->
		<!-- 	<h1 class="pb-3 text-center text-3xl font-bold underline"> -->
		<!-- 		{title} -->
		<!-- 	</h1> -->
		<!-- {/if} -->
		<div class="">
			{#key globalKey}
				{@render handleArr(renderedComponents)}
			{/key}
		</div>
	</div>
</div>


{#snippet handleArr(items: Block | Block[],recur=false)}
	{#each items as renderSpec}
		{#if renderSpec}
{#if Array.isArray(renderSpec)}
{@render handleArr(renderSpec,true)}
{:else if renderSpec.renderType == 'group'}
				{@const { type, blocks } = renderSpec}
				{@render Group(type, blocks,!recur && classes.group)}
			{:else}
<!-- {@render Group('col',[renderSpec])} -->
	{#if !recur && renderSpec.renderType==='block'}
{@render Group('col',[renderSpec],!recur && classes.group)}
{:else}
				{@const { component, props } = renderSpec}
					{@render Block(component, props)}
{/if}
			{/if}
		{/if}
	{/each}
{/snippet}



{JSON.stringify(lastShown)}

{#snippet Block(Component: Snippet | 'header', props: InputProps,keys)}
{#key lastShown[props.index]}
	<div
	in:fade={{ duration:275,delay:200 }}
class={{
	
	[props.block?.class || classes.block]: true,
	' flex-col': !props.row,
	'flex':true
}}
	>
		{#if Component === 'header'}
			<p class={classes.header}>
				{props.index}
				<!-- {props.header} -->
			</p>
		{:else}
			{@const { hide, alias, html } = props.label}
			{#if !hide || alias}
				<label
					for={props.inputType}
					class={props.label.class || classes.label + ` ${props.label.additionalClass}`}
				>
					{#if html}
						{@html html}
					{:else}
						{alias || indexToHeader(props?.index || '')}
					{/if}
				</label>
			{/if}
				<Component
					{classes}
					bind:this={componentMap[props.index]}
					cls={props.input.class || classes.input}
					{...props}
					disabled={readonly || props.readonly || disableMap[props.index]}
				></Component>
		{/if}
	</div>
{/key}
{/snippet}


{#snippet handleBlocks(blocks)}
		{#each blocks as block, i}

			{#if block}
				{#if block.renderType === 'block'}
						{@render Block(block.component, block.props,block.props.index + i.toString()+forceRerender[block.props.index]?.toString())}
				{:else if Array.isArray(block)}
					{@render handleBlocks(block)}
				{:else}
					{@render handleBlocks(block.blocks)}
				{/if}
				{/if}

{/each}
{/snippet}

{#snippet Group(type: GroupType, blocks: Block[],cls)}
	<div
class={{'flex-col justify-center':type.toLowerCase()==='col',[cls]:true,'flex':true}}
	>
	{@render handleBlocks(blocks)}
	</div>
{/snippet}
