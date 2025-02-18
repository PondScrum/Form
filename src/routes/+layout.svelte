<script lang="ts">
import type { ComponentProps } from 'svelte';
import Form from '../Form.svelte';
import '../app.css';
let { children } = $props();

const defValidate = (a, b) => ({ valid: true, data: a });

type GetRendered = ComponentProps<typeof Form>['getRenderedItems'];
type OnChange = ComponentProps<typeof Form>['onChange'];

const onChange: OnChange = (allValues, lastInputInfo, methods) => {
	lastInputInfo.index === 'text' &&
		methods.setInternalValue('dynamic', 'force rerender manually', defValidate);
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
	return [normalText, dynamicSelect];
};
</script>

<div class="p-8">
	<Form
		{onChange}
		invalidBG={'bg-red-500'}
		onValid={(...args) => console.log('onValid', args)}
		onError={(...args) => console.log('onError', args)}
		onHide={(...args) => console.log('onHide', args)}
		{getRenderedItems}
	></Form>
</div>
<!-- {@render children()} -->
