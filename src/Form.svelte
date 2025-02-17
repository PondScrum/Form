<script lang="ts">
import { onMount, tick } from 'svelte';
import { scale } from 'svelte/transition';
let {
	invalidBG,
	onJSError,
	getRenderedItems,
	preOnChange,
	onChange,
	title,
	inputProps,
	initialValues,
	onError,
	onValid,
	onHide,
	customSpacing = true,
	getValidationSpec,
	validationLevel
} = $props();

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

const components = ['Text', 'Select', 'Date', 'InlineSelect', 'Col', 'Row', 'Boolean'];

let pivots = $state({});
let allValues = $state(initialValues || {});
let allProps = $state();
let renderedComponents = $state([]);

const buildTimeComponents = {
	Pivot: (valueIndex, ...matches) => {
		pivots[valueIndex] = {};
		const res = matches
			.map((e) => e(valueIndex))
			.filter((e) => e)
			.flat();

		const flatten = (items) => (items.every((e) => e.renderType) ? items : flatten(items.flat()));
		return flatten(res);
	},
	Match: (value, block) => {
		if (!Array.isArray(block)) block = [block];
		let includesBool = false;
		if (!Array.isArray(value)) value = [value];
		if (value.some((e) => typeof e === 'boolean')) includesBool = true;
		console.log(value);

		const uid = value.join('');
		return (valueIndex) => {
			pivots[valueIndex] ??= {};
			pivots[valueIndex][uid] = block;
			console.log(allValues[valueIndex], includesBool);
			if (
				(includesBool && Boolean(allValues[valueIndex])) ||
				value
					.slice()
					.map((e) => e.toString().toLowerCase())
					.includes(allValues[valueIndex]?.toString()?.toLowerCase())
			) {
				console.log('aaa', block);
				return block;
			}

			const allBlocks = block
				.flat()
				.map((e) => collectBlocks(e))
				.flat()
				.filter((e) => e);
			allBlocks.forEach((b) => onHide(b.props.index));
		};
	}
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
	allProps = inputProps;
	// getComponents = createConfigOnMount((props) => {
	// 	allProps = props;
	// });
	getComponents = getRenderedItems;
	wrappedComponents = Object.assign(
		buildTimeComponents,
		Object.fromEntries(
			components.map((type) => {
				const block = (index, ...args) => {
					index = index.toLowerCase();
					const oc = (value, focused) => inputChanged(index, value, focused);
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
							...allProps[index]
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

function createValidationParams(index, value, focused, props, vl) {
	return [value, focused];
	return [
		{
			add_accent: !focused,
			value,
			metadata: props
		},
		getValidationSpec(vl)
	];
}

function inputChanged(index, value, focused) {
	const readonly = allProps[index].readonly;
	try {
		index = index.toLowerCase();
		const valid = { valid: true, data: value };
		let [exp, relevant] = [valid, valid];
		if (!readonly) {
			const validate = allProps[index].validate;
			console.log(validate);
			exp = validate(...createValidationParams(index, value, focused, allProps[index], 'export'));
			console.log(exp);
			relevant =
				validationLevel !== 'export'
					? validate(
							...createValidationParams(index, value, focused, allProps[index], validationLevel)
						)
					: exp;

			if (preOnChange) {
				const { exportRes, relevantRes } = preOnChange({ index, value, exp, relevant });
				exp = exportRes;
				relevant = relevantRes;
			}
		}

		const rawValidationResponse = exp;
		const convertedResponse = handleValidationResponse(rawValidationResponse, value);
		allValues[index] = convertedResponse.value;

		const eventToRun = rawValidationResponse.valid ? onValid : onError;
		!readonly && eventToRun(index, rawValidationResponse.data, allValues);

		onChange(
			allValues,
			{ index, value: convertedResponse.value, focused },
			{ setInternalValue, setDisabled }
		);
		render();
		console.log(relevant, value, 'aa');
		return handleValidationResponse(relevant, value);
	} catch (e) {
		console.error(e);
		onJSError?.(e);
	}
}

let wrappedComponents;

export function setInternalValue(...args) {
	tick().then(() => {
		forceRerender[args[0]] ??= true;
		forceRerender[args[0]] = !forceRerender[args[0]];
		render();
	});
	return inputChanged(...args);
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

<div class="relative w-full h-min" in:scale={{ duration: 100, opacity: 0.2, start: 0.98 }}>
	<div class="">
		{#if title}
			<h1 class="text-3xl pb-3 font-bold underline text-center">
				{title}
			</h1>
		{/if}
		<div class="">
			{@render handleArr(renderedComponents)}
		</div>
	</div>
</div>

{#snippet Block(Component, props)}
	<div in:scale={{ duration: 100, opacity: 0.98, start: 0.98 }} class="flex text-sm flex-row py-2">
		<label
			for={props.inputType}
			class="min-w-36 lg:min-w-44 pr-4 text-lg xl:text-2xl text-wrap font-medium h-min my-auto"
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

{#snippet Group(type, blocks)}
	<div class:border-t={customSpacing} class:flex-col={type === 'Col'} class="flex">
		{#each blocks as block, i (i)}
			<p class="p-4"></p>
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
