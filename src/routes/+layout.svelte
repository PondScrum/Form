<script lang="ts">
import type { ComponentProps } from 'svelte';
import Form from '$lib/Form.svelte';
import '../app.css';
let { children } = $props();

const defValidate = (a, b) => ({ valid: true, data: a });

type GetRendered = ComponentProps<typeof Form>['getRenderedItems'];
type OnChange = ComponentProps<typeof Form>['onChange'];

const onChange: OnChange = (allValues, lastInputInfo, methods) => {
	console.log(allValues);
	// lastInputInfo.index === 'text' &&
	// 	methods.setInternalValue('dynamic', 'force rerender manually', defValidate);
};

const simpleFormEX: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select, Header },
	values
) => {
	const normalText = Text('text', (a) => ({ valid: a === 'z', data: a }), {});
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

const getRenderedItems: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select, Header },
	values
) => {
	const createSelect = (index, options) => Select(index, defValidate, options);

	const colOptions = {
		throat: 'throat',
		opening_height: 'opening_height',
		frame_type: 'Frame Type'
	};
	const isSelectorCol = (i) => i === 'frame_type';
	const selectorOptions = { c: 'c cased open' };
	const cmpOptions = { Equals: 'Equals', lt: 'Less Than', gt: 'Greater Than' };
	const indexSelect = Select('col', defValidate, colOptions, { hideLabel: true, aliasLabel: 'IF' });
	return [
		Header('Pocket Frame Rule'),
		indexSelect,
		Pivot(
			'col',
			Match(true, [
				Row(
					InlineSelect('colcmp', defValidate, cmpOptions, { col: true, hideLabel: true }),
					Pivot(
						'colcmp',
						Match(['lt', 'gt'], Boolean('Or Equal To', defValidate, { labelClass: 'pl-4' }))
					)
				),
				InlineSelect(
					'valuesource',
					defValidate,
					{ tableval: 'Table Cell Value', userval: 'Custom Value' },
					{ aliasLabel: 'Value Source' }
				),
				Pivot(
					'valuesource',
					Match(
						'userval',
						isSelectorCol(values.col)
							? createSelect('value', selectorOptions)
							: Text('value', defValidate, {})
					),
					Match('tableval', createSelect('Table Column Cell Value', colOptions))
				),
				Text('Show Error Message', defValidate, {})
			])
		)
	];
};
let valid = $state();

let currentRenderForm = $state(simpleFormEX);
</script>

<p class="p-4">
	bindable overall form validity:<b>{valid}</b>
</p>

<div class="p-8">
	<Form
		bind:valid
		{onChange}
		invalidBG={'bg-red-500'}
		getRenderedItems={currentRenderForm}
		onShow={(b) => {
			console.log(b, 'JUST SHOWN');
		}}
		onHide={(b) => {
			console.log(b, 'JUST HIDDEN');
		}}
	></Form>
</div>
<!-- {@render children()} -->
