let validationLevel = $state('low');

export const setValidationLevel = (v: string) => {
	validationLevel = v;
};

export const getValidationState = () => lowValidation;

const lowValidation = $derived(validationLevel === 'low');

export const textValidation = (required: boolean) => (value: string, focused: boolean) => {
	const valid = lowValidation || ((Boolean(value) || !required) && value.length < 255);
	return {
		valid,
		data: valid ? value : !value ? 'Field is required' : 'Response must be less than 255 characters'
	};
};

export const selectValidation = (value: string) => {
	const valid = lowValidation || Boolean(value);
	return { valid: valid, data: valid ? value : 'Must Select Value' };
};

export const dateValidation = (v: string) => {
	const valid = lowValidation || Boolean(v);
	return { valid, data: valid ? v : 'Field is required' };
};
