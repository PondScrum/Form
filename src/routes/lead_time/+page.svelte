<script lang="ts">
import Form from '$lib/Form.svelte';

function createValidationParams(index, value, focused, props, vl) {
	console.log(vl);
	return [
		{
			add_accent: !focused,
			value,
			metadata: props
		},
		{}
	];
}
const defVal = (a) => ({ valid: true, data: a });
const PROPS = {
	lead_time: { validate: defVal },
	order_type: {
		cls: 'w-[6.5rem] h-[1.625rem] lg:h-[1.875rem]',
		options: { delivery: 'delivery', pickup: 'pickup' },
		validate: defVal
	},
	mfg_location: {
		cls: 'border dark-border rounded p-1 w-[13rem] font-semibold b h-8',
		options: structuredClone({ a: 'a' }),
		validate: defVal
	},
	method: {
		options: { PT: 'Pool Truck' },
		validate: defVal
	},
	zip_code: {
		validate: (details, validationSpec) => {
			const { value } = details;
			const data = value;
			console.log(data);
			let background_color = 'bg-red-500';
			if (data === '' && validationSpec.allow_empty) return { valid: true, data };
			if (!data.split('').every((e) => !Number.isNaN(parseInt(e)))) {
				return { valid: false, data: 'Not a number' };
			}
			if (data.length !== 6) {
				return { valid: false, data: 'Must be 6 digits' };
			}
			return { valid: true, data };
		}
	},
	pickup_type: {
		cls: 'w-[6.5rem] h-[1.625rem] lg:h-[1.875rem] ',
		options: { direct: 'direct', third_party: '3rd party' },
		validate: (details, validationSpec) => {
			const valid = Boolean(details.value) || validationSpec.allow_empty;
			return { valid, data: valid ? details.value : 'Selection Required' };
		}
	},
	standard_lead: {
		validate: (a) => {
			return { valid: true, data: a.value };
		}
	},
	date: { validate: defVal },
	pool_truck: {
		type: 'inlineselect',
		validate: defVal,
		options: { available: 'available', standard: 'standard' },
		cls: 'w-[6.5rem] h-[1.625rem] lg:h-[1.875rem]'
	},
	contact_email: {
		validate: (a, b) => {
			const res = defVal(a, b);
			if (!res.valid) return res;
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(res.data)) return { valid: false, data: 'Invalid Email' };
			return { valid: true, data: res.data };
		}
	}
};

function createItem(Component, index, props) {
	if (!props) return;
	const validate =
		() =>
		(...args) =>
			props.validate(...createValidationParams(index, ...args, props, 'pre-export'));
	return props.options
		? Component(index, validate(), props.options, { input: { class: props.cls } })
		: Component(index, validate(), {});
}

const render: GetRenderedItems = (
	{ InlineSelect, Select, Text, Pivot, Match, Col, Row, Date, Boolean },
	values
) => {
	const Item = (component, index) => createItem(component, index, PROPS[index]);
	const PICKUP = [Item(InlineSelect, 'pickup_type'), Item(Select, 'mfg_location')];
	const DELIVERY = [Item(Text, 'zip_code'), Item(Select, 'method')];
	const DATE = [Item(Boolean, 'standard_lead'), Item(Date, 'date')];
	const POOL_TRUCKS = [Item(InlineSelect, 'pool_truck')];
	return [
		Item(InlineSelect, 'order_type'),
		Pivot(
			'order_type',
			Match('pickup', [
				PICKUP,
				Pivot('pickup_type', Match('third_party', Item(Text, 'contact_email')))
			]),
			Match('delivery', [DELIVERY, Pivot('method', Match('pt', POOL_TRUCKS))]),
			Match(true, [DATE])
		)
	];
};

let localValues = $state({});

const tryParse = (s) => {
	try {
		return JSON.parse(s || '{}');
	} catch {
		return s;
	}
};
</script>

<Form
	readonly={true}
	classes={{
		border: 'dark-border',
		block: 'font-semibold border-standard py-2',
		label: 'h-8 min-w-32 xl:w-44 text-lg after:content-[":"]',
		invalid: 'invalid-bg'
	}}
	onJSError={(e) => {
		// SUMMARY.WrapTryCatch(
		// 	() => {
		// 		throw e;
		// 	},
		// 	'inputChanged',
		// 	'Lead Time Form'
		// );
	}}
	getRenderedItems={render}
	onChange={(allData, inputInfo, { setInternalValue, setDisabled }) => {
		console.log(allData);
		// if (inputInfo.index === 'mfg_location') {
		// 	const mfg_loc_res = changed('order_info', 'mfg_loc', inputInfo.value, inputInfo.focused);
		// }
		// if (inputInfo.index === 'standard_lead') {
		// 	if (!inputInfo.value) {
		// 		setDisabled('date', false);
		// 		return;
		// 	}
		// 	const newValue = dateToInputDate(addWorkDays(new Date(), DAYS_ADDED_TO_STD_LEAD));
		// 	setDisabled('date', Boolean(newValue));
		// 	const date_res = setInternalValue('date', newValue, inputInfo.focused);
		// }
		// if (inputInfo.index === 'order_type' && CONF.EXTERNAL) {
		// 	if (inputInfo.value === 'delivery') {
		// 		warning('Delivery is currently disabled');
		// 		setInternalValue('order_type', '');
		// 	}
		// }
		// changed('order_info', 'lead_time', JSON.stringify(allData), inputInfo);
	}}
></Form>
