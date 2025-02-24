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
	Lacerations: 'Lacerations'
};

import { page } from '$app/state';
import { type GetRenderedItems, type OnChange } from '$lib';

const textValidation = (required: boolean) => (value: string, focused: boolean) => {
	const valid = (value || !required) && value.length < 255;
	return {
		valid,
		data: valid ? value : !value ? 'Field is required' : 'Response must be less than 255 characters'
	};
};

const selectValidation = (value) => {
	return { valid: Boolean(value), data: Boolean(value) ? value : 'Must Select Value' };
};

export const render: GetRenderedItems = (
	{ Select, Row, Text, Textarea, Header, Date, InlineSelect },
	allValues
) => {
	const OTH_SELECT = (index, options) =>
		Select(index, selectValidation, Object.assign(options, { OTH: 'Other' }), {});
	return [
		//Header(page.state.location || '' + ' Safety Form'),
		Text('observer_name', textValidation(true)),
		Select('location', selectValidation, { ilm: 'ilm' }, {}),
		//Row(
		Date('date', (v) => ({ valid: Boolean(v), data: v })),
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
		OTH_SELECT('cat_haz_type', catHazType)
	];
};
