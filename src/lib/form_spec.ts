import type { GetRenderedItems } from '@pondscrum/form';

import { dateValidation, selectValidation, textValidation } from './validation.svelte';

import { catHazType, deptOfObv, locationOptions } from './options';

const date = Date;

export const getRenderedItems: GetRenderedItems = (
	{ Select, Text, Time, TextArea, Col, Date, Pivot, Match, InlineSelect, NestIndex },
	_
) => {
	return [
		//Header(page.state.location || '' + ' Safety Form'),
		Text('observer_name', textValidation(true)),
		Select('location', selectValidation, locationOptions),
		//Row(
		Date('date', dateValidation, {
			input: { elementAttributes: { max: new date().toISOString().split('T')[0] } }
		}),
		Time('time', textValidation(true)),
		//),
		InlineSelect(
			'safety_status',
			selectValidation,
			{ SA: 'Safe', US: 'Unsafe', NM: 'Near Miss' },
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),
		InlineSelect(
			'incident_type',
			selectValidation,
			{ action: 'action', condition: 'condition' },
			{ input: { class: 'w-20 text-sm font-medium text-black/90 h-8 p-0' } }
		),

		Col(
			Select('dept', selectValidation, deptOfObv, {}),
			Pivot(
				'dept',
				Match(
					'OTH',
					Text(NestIndex('other', 'dept'), textValidation(true), {
						row: true,
						label: { alias: 'Other Dept', additionalClass: 'pr-4' }
					})
				)
			)
		),
		TextArea('dept_desc', textValidation(true), {
			label: { alias: 'Detailed Location of Observation' },
			input: { class: 'h-24 border rounded resize-none p-1 text-sm ' }
		}),
		TextArea('hazard_desc', textValidation(true), {
			label: { alias: 'Potential Hazard Description' },
			input: { class: 'h-24 border rounded resize-none p-1 text-sm ' }
		}),
		TextArea('safe_desc', textValidation(true), {
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
		Col(
			Select('cat_haz_type', selectValidation, catHazType, {
				label: { alias: 'Category or Hazard Type' }
			}),
			Pivot(
				'cat_haz_type',
				Match(
					'OTH',
					Text(NestIndex('other', 'cat_haz_type'), textValidation(true), {
						row: true,
						label: { alias: 'Other Category or Hazard Type', additionalClass: 'pr-4' }
					})
				)
			)
		)
	];
};
