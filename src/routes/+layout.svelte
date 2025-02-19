<script lang="ts">
import type { ComponentProps } from 'svelte';
import Form from '$lib/Form.svelte';
import '../app.css';
let { children } = $props();

const defValidate = (a, b) => ({ valid: true, data: a });

type GetRendered = ComponentProps<typeof Form>['getRenderedItems'];
type OnChange = ComponentProps<typeof Form>['onChange'];

const onChange: OnChange = (allValues, lastInputInfo, methods) => {
	// lastInputInfo.index === 'text' &&
	// 	methods.setInternalValue('dynamic', 'force rerender manually', defValidate);
};

const getRenderedItems: GetRendered = (
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select },
	values
) => {
	const normalText = Text('text', defValidate, {});
	const dynamicSelect = Select(
		'dynamic',
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
				InlineSelect('inline_select', (a) => a !== 'z', { '0': '0', '1': '1' }, {})
			])
		)
	];
};
let valid = $state();
</script>

<p class="p-4 text-lg font-semibold">
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
