<script lang="ts">
import 'tippy.js/animations/scale-subtle.css';
import 'tippy.js/dist/tippy.css';
import Input from './Input.svelte';
import { onMount, setContext, tick, untrack, type Component, type Snippet } from 'svelte';
import { fade, scale, slide } from 'svelte/transition';
import type {
	Block,
	GroupSpec,
	BlockSpec,
	GroupType,
	Index,
	InputComponentPublicFns,
	InputProps,
	Pivot,
	Props,
	ProvidedComponents,
	Validate,
	RenderArrItems,
	Match,
	OptionInput,
	InternalInputProps,
	Classes,
	AllValues,
	StandardInput,
	SelectOptions,
	ChangeResponse
} from './types/internal.ts';

import { components, defaultClasses } from './Form';
import type { PublicInputProps } from './types/public';

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
	svelteTransition = (e) => slide(e, { duration: 125 })
}: Props = $props();

classes = Object.assign(defaultClasses, classes);

const globalClasses = classes as Classes;
let allProps: Readonly<Record<string, any>> = $state({});
let validityMap: Record<string, boolean> = $state({});

function handleValidationResponse(res: ReturnType<Validate>, currentValue = ''): ChangeResponse {
	const isValid = res.valid;
	return {
		valid: isValid,
		value: isValid ? res.data : currentValue,
		tooltip: isValid ? '' : res.data,
		background_color: isValid ? '' : globalClasses.invalid
	};
}

let pivots: Record<string, Record<string, Block[]>> = $state({});
let allValues: AllValues = $state(initialValues || {});
let renderedComponents: Block[] = $state([]);
// let hidden: string[] = $state([]);

let hidden: Record<string, boolean> = $state({});
let lastShown: Record<string, boolean> = $state({});

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
			tick().then(() => {
				lastShown[index] = true;
			});

			hidden[index] && events.show?.(handleNested(index).publicIndex);
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
				tick().then(() => {
					lastShown[index] = false;
				});

				events.hide?.(handleNested(index).publicIndex);
				return index;
			}
		};
		allBlocks.forEach((e) => hide(e.props.index));
		return [];
	};
};

const pivot: Pivot = (valueIndex, ...matches) => {
	pivots[valueIndex] = {};
	const res: RenderArrItems = matches
		.map((e) => e(valueIndex))
		.filter((e) => e)
		.flat();

	const flatten = (items: (Block | Block[])[]): Block[] =>
		items.every((e) => !Array.isArray(e) && e.renderType)
			? (items as Block[])
			: flatten(items.flat());

	return flatten(res);
};

function cleanupEmptyObjects<T extends any>(obj: T): T {
	const getObj: (t: any) => Record<string, any> | undefined = (t) =>
		typeof t === 'object' && !Array.isArray(t) && t;
	const o = getObj(obj);
	if (!o) return obj;
	Object.keys(o).forEach((k) => {
		const next = getObj(o[k]);
		if (!next) return;
		if (Object.keys(next).length === 0) {
			delete o[k];
		} else {
			cleanupEmptyObjects(next);
		}
	});
	return obj;
}
const NEST_DELIMETER = ';';

const buildTimeComponents = {
	Pivot: pivot,
	Match: match,
	NestIndex: (...indexes: string[]) => {
		return NEST_DELIMETER + indexes.join(NEST_DELIMETER);
	}
};
function isNested(index: string) {
	return index?.[0] === NEST_DELIMETER;
}

const isGroup = (type: string) => ['Col', 'Row'].includes(type);

function render() {
	const components = getRenderedItems(wrappedComponents, allValues);
	const toRender = components.filter((e) => e).flat();
	if (wrappedComponents) {
		setRendered(toRender);
	}
}

function setup() {
	wrappedComponents = Object.assign(
		buildTimeComponents,
		Object.fromEntries(
			components.map((type) => {
				const block = (
					index: string,
					validate: Validate,
					thirdParam: undefined | InputProps | SelectOptions,
					fourthParam: undefined | InputProps
				): BlockSpec => {
					const requiresOptions = type.toLowerCase().includes('select');
					const publicProps = ((requiresOptions ? fourthParam : thirdParam) ||
						{}) as PublicInputProps;
					const options = (requiresOptions && thirdParam) as SelectOptions | undefined;
					index = index.toLowerCase();
					const fullPublicProps: PublicInputProps = Object.assign(
						{
							label: {},
							input: {},
							row: false,
							readonly: false,
							key: ''
						},
						structuredClone(publicProps)
					);
					const indexRes = handleNested(index);
					fullPublicProps.input.class ??=
						(globalClasses.input || '') +
						((globalClasses.border && ' border ' + globalClasses.border) || '');
					const oc = (value: string, focused: boolean) =>
						inputChanged(index, value, focused, validate);
					const nestRes = handleNested(index, allValues);

					const props: InternalInputProps = {
						index,
						id: `${type}-${index}`,
						valueChanged: oc,
						publicIndex: indexRes.publicIndex,
						initialValue: nestRes.ref[nestRes.index] || '',
						inputType: type.toLowerCase(),
						options,
						...fullPublicProps
					};

					allProps[index] = props; //only assignment

					const res: BlockSpec = {
						renderType: 'block',
						component: Input,
						props
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

function collectBlocks(obj: BlockSpec | GroupSpec): BlockSpec[] {
	if (!obj) return [];
	if (typeof obj !== 'object') return [];
	if ('blocks' in obj) {
		const res = obj.blocks.map((e) => collectBlocks(e)).flat() as {
			renderType: 'block';
			props: InternalInputProps;
			component: Snippet;
		}[];
		return res;
	} else if (obj.renderType === 'block') {
		return [obj];
	}
	return [];
}

function determineValidity() {
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
	DELETE_EMPTY_NESTED && cleanupEmptyObjects(res);
	return res;
}

function getValue(originalIndex: string) {
	const res = handleNested(originalIndex, allValues);
	return res.ref[res.index];
}
function handleNested(index: string, ref: Record<string, any> = {}) {
	if (!isNested(index)) return { ref, index, publicIndex: index };
	const allIndexes = index.split(NEST_DELIMETER).filter((e) => e);
	const rootIndex = allIndexes[0];
	const finalIndex = allIndexes.slice(-1)[0];
	allIndexes.slice(0, allIndexes.length - 1).forEach((e) => {
		ref[e] ??= {};
		ref = ref[e];
	});
	return { ref, index: finalIndex, rootIndex, publicIndex: allIndexes };
}

function inputChanged(
	index: string,
	value: string,
	focused: boolean,
	validate: Validate
): ChangeResponse {
	let validationRes = { valid: true, data: value };
	const props: Readonly<InputProps> = allProps[index];
	const RO = readonly || props?.readonly;
	const res = handleNested(index, allValues);
	const originalIndex = index;
	const publicIndex = res.publicIndex;

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
		if (!RO) {
			validationRes = validate(value, focused);
		}

		validityMap[originalIndex] = validationRes.valid;

		const convertedResponse = handleValidationResponse(validationRes, value);

		dataRef[index] = convertedResponse.value;
		//allValues[originalIndex]=convertedResponse.value;
		const eventToRun = events[validationRes.valid ? 'valid' : 'error'];
		!RO && eventToRun && eventToRun(publicIndex, validationRes.data);
		tick().then(() => {
			render();
			!RO &&
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
	return handleValidationResponse(validationRes, value);
}

let wrappedComponents: ProvidedComponents;

function indexToString(index: Index): string {
	return Array.isArray(index) ? NEST_DELIMETER + index.join(NEST_DELIMETER) : index;
}

export function setInternalValue(idx: Index, value: string) {
	const index = indexToString(idx);
	tick().then(() => {
		const component = componentMap[index];
		if (!component) {
			console.log(
				`Index does not exist as provided render item, force setting value: ${value} at index ${index}`
			);
			inputChanged(index, value, true, (a) => ({ valid: true, data: a }));
			return;
		}
		componentMap[index]?.setValue(value);
	});
}

export function setDisabled(index: Index, state: boolean) {
	disableMap[indexToString(index)] = state;
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
export const onscroll = (e: HTMLElement) => {
	const PADDING = 15;
	const bound = e.getBoundingClientRect();
	if (!bound) return;
	const maxTop = bound.top + PADDING;
	const maxBottom = bound.bottom - PADDING;
	const allIndexes: [null | HTMLElement, InputComponentPublicFns][] = Object.values(
		componentMap
	).map((e) => [document.getElementById(e.elemId), e]);
	allIndexes.forEach(([e, ref]) => {
		const coords = e?.getBoundingClientRect();
		if (!coords) return;
		ref.hideTooltip(coords.top < maxTop || coords.bottom > maxBottom);
	});
};

let scrollParent: null | HTMLElement = $state(null);
function listenToScrollParent(element: HTMLElement): () => void {
	function getScrollParent(node: HTMLElement | null) {
		if (node == null) {
			return null;
		}
		if (node.scrollHeight > node.clientHeight) {
			return node;
		} else {
			return getScrollParent(node.parentElement);
		}
	}
	const scrl = (e: MouseEvent) => e.target && onscroll(e.target as HTMLElement);
	tick().then(() =>
		tick().then(() => {
			scrollParent = getScrollParent(element.parentElement);
			scrollParent?.addEventListener('scroll', scrl);
		})
	);
	return () => {
		scrollParent?.removeEventListener('scroll', scrl);
	};
}

$effect(()=>{
	globalKey;
	const sp=untrack(()=>scrollParent)
	sp && tick().then(()=>onscroll(sp))
})
</script>

<div
	use:listenToScrollParent
	class="relative h-min w-full"
	in:scale={{ duration: 100, opacity: 0.2, start: 0.98 }}
>
	<div class="">
		{#key globalKey}
			{@render handleArr(renderedComponents)}
		{/key}
	</div>
</div>

{#snippet handleArr(items: Block[], recur = false)}
	{#each items as renderSpec}
		{#if renderSpec}
			{#if Array.isArray(renderSpec)}
				{@render handleArr(renderSpec, true)}
			{:else if renderSpec.renderType == 'group'}
				{@const { type, blocks } = renderSpec}
				{@render Group(type, blocks, !recur ? globalClasses.group : '')}
			{:else if !recur && renderSpec.renderType === 'block'}
				{@render Group('col', [renderSpec], !recur && globalClasses.group)}
			{:else}
				{@const { component, props } = renderSpec}
				{@render Block(component, props)}
			{/if}
		{/if}
	{/each}
{/snippet}

{#snippet Block(Cmp: Component<any> | 'header', props: InternalInputProps)}
	{#key lastShown[props.index] || forceRerender[props.index] || props.index}
		<div
			in:svelteTransition
			class={{
				[globalClasses.block]: globalClasses.block,
				' flex-col': !props.row,
				flex: true
			}}
		>
			{#if Cmp === 'header'}
				<p class={globalClasses.header}>
					{props.index}
				</p>
			{:else}
				{@const { hide, alias, html } = props.label}
				{#if !hide || alias}
					<label
						for={props.id}
						class={props.label.class || globalClasses.label + ` ${props.label.additionalClass}`}
					>
						{#if html}
							{@html html}
						{:else}
							{alias || indexToHeader(props?.index || '')}
						{/if}
					</label>
				{/if}
				<Cmp
					{classes}
					bind:this={componentMap[props.index]}
					cls={props.input.class || globalClasses.input}
					{...props}
					disabled={readonly || props.readonly || disableMap[props.index]}
				></Cmp>
			{/if}
		</div>
	{/key}
{/snippet}

{#snippet handleBlocks(blocks: Block[])}
	{#each blocks as block}
		{#if block}
			{#if Array.isArray(block)}
				{@render handleBlocks(block)}
			{:else if block.renderType === 'block'}
				{@render Block(block.component, block.props)}
			{:else}
				{@render handleBlocks(block.blocks)}
			{/if}
		{/if}
	{/each}
{/snippet}

{#snippet Group(type: GroupType, blocks: Block[], cls: string)}
	<div class={{ 'flex-col justify-center': type.toLowerCase() === 'col', [cls]: true, flex: true }}>
		{@render handleBlocks(blocks)}
	</div>
{/snippet}
