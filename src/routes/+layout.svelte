<script lang="ts">
import 'tippy.js/animations/scale-subtle.css';
import 'tippy.js/dist/tippy.css';
import {default as Z} from '../../dist/index.js'


import type { ComponentProps } from 'svelte';
import Form from '$lib/Form.svelte';
import '../app.css';
let { children } = $props();

const defValidate = (a, b) => ({ valid: Boolean(a), data: Boolean(a) ? a : 'must have a value' });

// type GetRendered = ComponentProps<typeof Form>['getRenderedItems'];
// type OnChange = ComponentProps<typeof Form>['onChange'];

import type { OnChange, GetRenderedItems } from '../lib/types/public.ts';

const wrapOnChange = (formNumber: number) => {
	const onChange: OnChange = (allValues, lastInputInfo, methods) => {
		values[formNumber] = allValues;
		formVals[formNumber] = allValues;
		lastInputInfo.index === 'field0' && methods.setInternalValue('field1', 'z');
		if (
			lastInputInfo.index === 'then' &&
			lastInputInfo.value === 'and' &&
			forms.length - 2 === formNumber
		) {
			forms.push(getRenderedItems);
		}
	};
	return onChange;
};
const barebonesEX = (i, { Text, TextArea }, values) => {
	const res = Array.from({ length: 5 }).map((e, i) =>
		Text('field' + i, defValidate, { labelClass: 'w-42' })
	);
	res.push(
		TextArea('textarea', defValidate, {
			cls: 'border resize-none outline-none h-24 rounded p-1',
			labelClass: 'w-42'
		})
	);
	return res;
};

const simpleFormEX: GetRenderedItems = (
	i,
	{ InlineSelect, Row, Col, Boolean, Pivot, Match, Text, Select, Header, Date },
	values
) => {
	const normalText = Text(
		'text',
		(a) => ({ valid: a.length > 10, data: a.length < 10 ? 'Must be 10 or more characters' : a }),
		{}
	);
	const dynamicSelect = Select(
		'Select (dynamic options)',
		defValidate,
		Object.fromEntries(values.text?.split('').map((e) => [e, e]) || []),
		{}
	);
	return [
		Header('Header'),
		normalText,
		Pivot(
			'text',
			Match(true, [
				dynamicSelect,
				InlineSelect(
					'inline_select',
					defValidate,
					{ '0': '0', '1': '1' },
					{ input: { class: 'a w-52' } }
				),
				Date('date', defValidate, {})
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
		label: {
			alias: 'IF'
		},
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
						'cmp',
						(...args) =>
							isSelectorCol(values.col) ? { valid: true, data: 'Equal' } : defValidate(...args),
						cmpOptions(isSelectorCol(values.col)),
						{ label: { alias: 'Is' } }
					),
					// Pivot('col',Match('frame_type',InlineSelect('colcmp',defValidate,cmpOptions(true),{})),Match('opening_height',InlineSelect('colcmp',defValidate,cmpOptions(false), { col: true, hideLabel: true }))),

					Pivot(
						//left off here, pivot needs to rerender when other item hidden
						'cmp',
						Match(
							['lt', 'gt'],
							Boolean('or_equal_to', defValidate, {
								input: {
									class: 'mx-auto mb-auto'
								},
								label: {
									alias: 'Or Equal To?',
									class: 'text-nowrap text-lg mt-auto pl-4 font-bold text-center '
								},
								block: {
									class: ''
								},
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
						{
							label: {
								alias: values.colcmp === 'Equal' ? 'To a' : 'a',
								class: 'text-nowrap my-auto pr-2 text-lg'
							}
						}
					),
					Pivot(
						'valuesource',
						Match(
							'userval',
							isSelectorCol(values.col)
								? createSelect('value', selectorOptions, {
										label: {
											class: 'e',
											html: arrowSVG
										}
									})
								: Text('value', defValidate, {
										label: {
											class: 'e',
											html: arrowSVG
										}
									})
						),
						Match(
							'tableval',
							createSelect('Table Column Cell Value', colOptions, {
								label: {
									class: 'e',
									html: arrowSVG
								}
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
let valid = $state({});

let forms = $state(['a', getRenderedItems]);

let formVals = $state({});

let values = $state({});

$inspect(forms);
</script>

<div class="flex max-h-[100svh] flex-col">
	<div class="flex h-52 max-h-52 overflow-hidden">
		<div>
			<p class="p-2 text-center text-xl">bindable overall form validity:</p>
			<p class="text-center text-2xl font-bold">{Object.values(valid).every((e) => e)}</p>
		</div>

		<div class="max-h-full grow overflow-auto border-l p-2 px-4">
			<p class="text-lg font-bold">All Values</p>

			{#each Object.values(values) as value}
				<p class="whitespace-pre">
					{JSON.stringify(value, null, '\t')}
				</p>
			{/each}
		</div>

		<p class="w-64">
			{forms[0]}
		</p>
	</div>

	<div
		class="flex justify-center text-xl font-medium *:mx-1 *:rounded-sm *:border *:p-2 *:capitalize"
	>
		<button
			onclick={() => {
				forms = [
					`
const barebonesEX = ({Text},values)=>{
	return Array.from({length:5}).map((e,i)=>Text('field'+i,defValidate,{})) 
}
		`,
					barebonesEX
				];
			}}
		>
			barebones
		</button>
		<button
			onclick={() => {
				forms = ['z', simpleFormEX];
			}}
		>
			simple
		</button>

		<button
			onclick={() => {
				forms = ['p', getRenderedItems];
			}}
		>
			Advanced
		</button>
	</div>
	<div class="mt-6 grow overflow-auto border-t p-8 pt-2">
		{#key forms[0]}
			{#each forms.slice(1, forms.length) as getRenderedItems, i (i)}
				{#if i === 0 || formVals[i - 1]?.then === 'and'}
					<div
						style="padding: {i + 2}rem; padding-top:1rem; padding-bottom: 0rem;"
						class="mx-auto w-3/4 overflow-auto border-x font-bold first:border-t last:border-b"
					>
						<Form
							deleteOnHide={true}
							classes={{
								input: 'bg-orange-500',
								label: 'w-auto pr-2 h-min my-auto font-bold text-lg',
								invalid: 'bg-red-700/80 text-white',
								block: 'min-h-22',
								border: 'border-gray-500'
							}}
							bind:valid={valid[i]}
							onChange={wrapOnChange(i)}
							getRenderedItems={(...args) => getRenderedItems(i, ...args)}
							events={{
								hide: (i) => console.log(i)
							}}
						></Form>
					</div>
				{/if}
			{/each}
		{/key}
	</div>
</div>
