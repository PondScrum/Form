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
const arrowSVG = `<div class='h-full px-3 flex'> <svg xmlns="http://www.w3.org/2000/svg" class='my-auto' width="19.99" height="18" viewBox="0 0 19.99 18">
  <polygon points="10.029 5 0 5 0 12.967 10.029 12.967 10.029 18 19.99 8.952 10.029 0 10.029 5"/>
	</svg></div>`;

const cmpDisplayMap = {
	gt: 'is greater than',
	lt: 'is less than',
	Equal: 'equals'
};

let hasHeader = false;
const getRenderedItems: GetRendered = (
	i,
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
		i === 0 && Header('Pocket Frame Rule'),
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
						Match(
							['lt', 'gt'],
							Boolean('Or Equal To?', defValidate, {
								inputClass: 'mx-auto',
								labelClass: 'text-nowrap pl-4 font-bold text-center underline',
								col: true
							})
						)
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
						{ aliasLabel: values.colcmp === 'equal' ? 'To a' : 'a' }
					),
					Pivot(
						'valuesource',
						Match(
							'userval',
							isSelectorCol(values.col)
								? createSelect('value', selectorOptions, { labelClass: 'e', labelHTML: arrowSVG })
								: Text('value', defValidate, { labelClass: 'e', labelHTML: arrowSVG })
						),
						Match(
							'tableval',
							createSelect('Table Column Cell Value', colOptions, {
								labelClass: 'e',
								labelHTML: arrowSVG
							})
						)
					)
				),
				// Row(
				InlineSelect(
					'then',
					defValidate,
					{ and: 'AND', error: 'Show Error', warning: 'Show Warning' },
					{ hideLabel: true }
				),
				Pivot('then', Match(['error', 'warning'], Text('message', defValidate, {})))
				//			) //Match('and',Form) for now handle it within oncahnge and this components state
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
			<div
				style="padding: {i + 2}rem; padding-top:1rem; padding-bottom: 0rem;"
				class="mx-auto w-3/4 overflow-auto font-bold first:border-t last:border-b"
			>
				<Form
					classes={{
						label: 'w-auto pr-2 h-min my-auto font-bold text-lg',
						invalid: 'bg-red-700/80 text-white'
					}}
					bind:valid
					onChange={(...args) => onChange(i, ...args)}
					getRenderedItems={(...args) => getRenderedItems(i, ...args)}
					onShow={(b) => {
						console.log('onShow', b);
					}}
					onHide={(b) => {
						console.log('onHide', b);
					}}
				></Form>
			</div>
		{/if}
	{/each}
</div>
