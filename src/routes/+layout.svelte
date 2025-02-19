<script lang="ts">
import 'tippy.js/animations/scale-subtle.css';
import 'tippy.js/dist/tippy.css';

import type { ComponentProps } from 'svelte';
import Form from '$lib/Form.svelte';
import '../app.css';
let { children } = $props();

const defValidate = (a, b) => ({ valid: Boolean(a), data: Boolean(a) ? a : 'must have a value' });

type GetRendered = ComponentProps<typeof Form>['getRenderedItems'];
type OnChange = ComponentProps<typeof Form>['onChange'];

const onChange: OnChange = (formNumber, allValues, lastInputInfo, methods) => {
	formVals[formNumber] = allValues;
	if (
		lastInputInfo.index === 'then' &&
		lastInputInfo.value === 'and' &&
		forms.length - 1 === formNumber
	) {
		forms.push(getRenderedItems);
	}
};

const simpleFormEX: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select, Header },
	values
) => {
	const normalText = Text('text', (a) => ({ valid: a === 'z', data: 'Error Msg ' + a }), {});
	const dynamicSelect = Select(
		'Select (dynamic options)',
		defValidate,
		Object.fromEntries(values.text?.split('').map((e) => [e, e]) || []),
		{}
	);
	return [
		normalText,
		Pivot(
			'text',
			Match(true, [
				dynamicSelect,
				InlineSelect('inline_select', defValidate, { '0': '0', '1': '1' }, {})
			])
		)
	];
};

const cmpDisplayMap = {
	gt: 'is greater than',
	lt: 'is less than',
	Equal: 'equals'
};

const getRenderedItems: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select, Header },
	values
) => {
	const createSelect = (index, options, props) => Select(index, defValidate, options, props);

	const colOptions = {
		throat: 'throat',
		opening_height: 'opening_height',
		frame_type: 'Frame Type'
	};
	const isSelectorCol = (i) => i === 'frame_type';
	const selectorOptions = { c: 'c cased open' };
	const cmpOptions = (onlyeq) => {
		const equals = { Equal: 'Equal' };
		if (onlyeq) return equals;
		return Object.assign(equals, { lt: 'Less Than', gt: 'Greater Than' });
	};
	const indexSelect = Select('col', defValidate, colOptions, {
		hideLabel: true,
		aliasLabel: 'IF',
		key: 'colcmp'
	});

	const valueString = `If ${values.col} ${cmpDisplayMap[values.colcmp]} `;
	return [
		//Header('Pocket Frame Rule'),
		indexSelect,
		Pivot(
			'col',
			Match(true, [
				Row(
					InlineSelect(
						'colcmp',
						(...args) =>
							isSelectorCol(values.col) ? { valid: true, data: 'Equals' } : defValidate(...args),
						cmpOptions(isSelectorCol(values.col)),
						{ aliasLabel: 'Is' }
					),
					// Pivot('col',Match('frame_type',InlineSelect('colcmp',defValidate,cmpOptions(true),{})),Match('opening_height',InlineSelect('colcmp',defValidate,cmpOptions(false), { col: true, hideLabel: true }))),

					Pivot(
						//left off here, pivot needs to rerender when other item hidden
						'colcmp',
						Match(['lt', 'gt'], Boolean('Or Equal To', defValidate, { labelClass: 'pl-4' }))
					)
					// Pivot('col',Match(true,Pivot(//left off here, pivot needs to rerender when other item hidden
					// 	'colcmp',
					// 	Match(['lt', 'gt'], Boolean('Or Equal To', defValidate, { labelClass: 'pl-4' }))
					// )))
				),
				Row(
					InlineSelect(
						'valuesource',
						defValidate,
						{ tableval: 'Current Table Value', userval: 'Custom Value' },
						{ aliasLabel: 'To A' }
					),
					Pivot(
						'valuesource',
						Match(
							'userval',
							isSelectorCol(values.col)
								? createSelect('value', selectorOptions, { hideLabel: true })
								: Text('value', defValidate, { hideLabel: true })
						),
						Match(
							'tableval',
							createSelect('Table Column Cell Value', colOptions, { hideLabel: true })
						)
					)
				),
				Row(
					InlineSelect(
						'then',
						defValidate,
						{ error: 'Show Error Message', warning: 'Show Warning Message', and: 'and' },
						{ hideLabel: true }
					),
					Pivot(
						'then',
						Match(['error', 'warning'], Text('message', defValidate, { hideLabel: true }))
					)
				) //Match('and',Form) for now handle it within oncahnge and this components state
			])
		)
	];
};
let valid = $state();

let forms = $state([getRenderedItems]);

let formVals = $state({});
</script>

<p class="p-4">
	bindable overall form validity:<b>{valid}</b>
</p>

<div class="p-8">
	<!-- {#key currentRenderForm} -->
	{#each forms as getRenderedItems, i (i)}
		{#if i === 0 || formVals[i - 1]?.then === 'and'}
			<Form
				bind:valid
				onChange={(...args) => onChange(i, ...args)}
				invalidBG={'bg-red-500/80'}
				{getRenderedItems}
				onShow={(b) => {
					console.log(b, 'JUST SHOWN');
				}}
				onHide={(b) => {
					console.log(b, 'JUST HIDDEN');
				}}
			></Form>
		{/if}
	{/each}
	<!-- <Form -->
	<!-- 	bind:valid -->
	<!-- 	{onChange} -->
	<!-- 	invalidBG={'bg-red-500'} -->
	<!-- 	getRenderedItems={currentRenderForm} -->
	<!-- 	onShow={(b) => { -->
	<!-- 		console.log(b, 'JUST SHOWN'); -->
	<!-- 	}} -->
	<!-- 	onHide={(b) => { -->
	<!-- 		console.log(b, 'JUST HIDDEN'); -->
	<!-- 	}} -->
	<!-- ></Form> -->
	<!-- {/key} -->
</div>
<!-- {@render children()} -->
