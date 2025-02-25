let validationLevel = $state('low');
export const setValidationLevel = (v) => {
	validationLevel = v;
};
const lowValidation = $derived(validationLevel === 'low');
export const getValidationChange = () => lowValidation;
const door = 'door';
const frame = 'frame';
const ship = 'shipping';
const paint = 'Wet Paint';
const powder = 'Powder Coat';
const office = 'Office';
const exterior = 'Exterior of building';

const deptOfObv = {
	door,
	frame,
	ship,
	paint,
	powder,
	office,
	exterior,
	OTH: 'Other'
};

const catHazType = {
	'Exterior Property': 'Exterior Property',
	Building: 'Building',
	'Tools and Equipment': 'Tools and Equipment',
	Machinery: 'Machinery',
	Procedures: 'Procedures',
	Housekeeping: 'Housekeeping',
	'Struck By or Striking Against': 'Struck By or Striking Against',
	'Caught in, on or between': 'Caught in, on or between',
	Lacerations: 'Lacerations',
	OTH: 'Other'
};

import { page } from '$app/state';
import { type GetRenderedItems, type OnChange } from '$lib';

const textValidation = (required: boolean) => (value: string, focused: boolean) => {
	const valid = lowValidation || ((value || !required) && value.length < 255);
	return {
		valid,
		data: valid ? value : !value ? 'Field is required' : 'Response must be less than 255 characters'
	};
};

const selectValidation = (value) => {
	const valid = lowValidation || Boolean(value);
	return { valid: valid, data: valid ? value : 'Must Select Value' };
};

function movePointer(index) {
	return (obj) => {
		obj[index] ??= {};
		return obj[index];
	};
}

export const render: GetRenderedItems = (
	{ Select, Row, Text, Textarea, Header, Date, Pivot, Match, InlineSelect, NestIndex },
	allValues
) => {
	const OTH_SELECT = (index, options) =>
		Select(index, selectValidation, Object.assign(options, { OTH: 'Other' }), {});
	return [
		//Header(page.state.location || '' + ' Safety Form'),
		Text('observer_name', textValidation(true)),
		Select('location', selectValidation, { ilm: 'ilm' }, {}),
		//Row(
		Date('date', (v) => {
			const valid = lowValidation || Boolean(v);
			return { valid, data: valid ? v : 'Field is required' };
		}),
		Text('time', textValidation(true), {}),
		//),
		InlineSelect(
			'type',
			selectValidation,
			{ SA: 'Safe', US: 'Unsafe', NM: 'Near Miss' },
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),
		InlineSelect(
			'type2',
			selectValidation,
			{ action: 'action', condition: 'condition' },
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),

		Select('dept', selectValidation, deptOfObv, {}),
		Pivot(
			'dept',
			Match(
				'OTH',
				Text(NestIndex('other', 'dept'), textValidation(true), {
					col: false,
					label: { alias: 'Other Dept', additionalClass: 'pr-4' }
				})
			)
		),
		Textarea('dept_desc', textValidation(true), {
			label: { alias: 'Detailed Location of Observation' },
			input: { class: 'h-24 border rounded resize-none p-1 text-sm ' }
		}),
		Textarea('hazard_desc', textValidation(true), {
			label: { alias: 'Potential Hazard Description' },
			input: { class: 'h-24 border rounded resize-none p-1 text-sm ' }
		}),
		Textarea('safe_desc', textValidation(true), {
			label: { alias: 'Safe Observation Description' },
			input: { class: 'h-24 border rounded resize-none p-1 text-sm ' }
		}),
		InlineSelect(
			'potential_severity',
			selectValidation,
			Object.fromEntries(['low', 'medium', 'high'].map((e) => [e, e])),
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),
		InlineSelect(
			'frequency',
			selectValidation,
			Object.fromEntries(['low', 'medium', 'high'].map((e) => [e, e])),
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),
		Select('cat_haz_type', selectValidation, catHazType, {
			label: { alias: 'Category or Hazard Type' }
		}),
		Pivot(
			'cat_haz_type',
			Match(
				'OTH',
				Text(NestIndex('other', 'cat_haz_type'), textValidation(true), {
					col: false,
					label: { alias: 'Other Cat Haz Type', additionalClass: 'pr-4' }
				})
			)
		)
	];
};
export const onscroll = (e) => {
	const bound = document.getElementById('bound')?.getBoundingClientRect();
	const maxTop = bound.top + 30;
	const maxBottom = bound.bottom - 30;
	document.querySelectorAll('[id^="tippy-"]').forEach((e) => {
		const coords = e.getBoundingClientRect();
		if (coords.top < maxTop || coords.bottom > maxBottom) {
			e._tippy.setProps({ duration: 125 });
			e._tippy.hide();
			setTimeout(() => e._tippy.setProps({ duration: 75 }), 150);
		}
	});
};
