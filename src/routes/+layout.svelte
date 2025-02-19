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

const getRenderedItems: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select },
	values
) => {
	// const normalText = Text('text', defValidate, {});
	// const dynamicSelect = Select(
	// 	'dynamic',
	// 	defValidate,
	// 	Object.fromEntries(values.text?.split('').map((e) => [e, e]) || []),
	// 	{}
	// );
	// return [
	// 	normalText,
	// 	Pivot(
	// 		'text',
	// 		Match(true, [
	// 			dynamicSelect,
	// 			InlineSelect('inline_select', (a) => a !== 'z', { '0': '0', '1': '1' }, {})
	// 		])
	// 	)
	// ];
	const createSelect = (index, options) => Select(index, defValidate, options, { hideLabel: true });

	const colOptions = {
		throat: 'throat',
		opening_height: 'opening_height',
		frame_type: 'Frame Type'
	};
	const cmpOptions = { Equals: 'Equals', lt: 'Less Than', gt: 'Greater Than' };

	const indexSelect = Select('col', defValidate, colOptions, { hideLabel: true });
	return [
		indexSelect,
		Pivot(
			'col',
			Match(true, [
				Row(
					InlineSelect('colcmp', defValidate, cmpOptions, { col: true, hideLabel: true }),
					Pivot('colcmp', Match(['lt', 'gt'], Boolean('Or Equal To', defValidate, {})))
				),
				createSelect(
					'col2',
					Object.fromEntries(Object.entries(colOptions).filter(([a, b]) => a !== values.col))
				)
			])
		)
	];
};
let valid = $state();
</script>

<p class="p-4 font-semibold">
	{valid}
</p>
<div class="p-8">
	<Form
		bind:valid
		{onChange}
		invalidBG={'bg-red-500'}
		{getRenderedItems}
		onShow={(b) => {
			console.log(b, 'JUST SHOWN');
		}}
		onHide={(b) => {
			console.log(b, 'JUST HIDDEN');
		}}
	></Form>
</div>
<!-- {@render children()} -->
