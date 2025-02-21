import type { Block, ProvidedComponents, ValidityEvent, VisibilityEvent } from './internal';

export type ProvidedMethods = {
	setInternalValue: (index: string, valid: string) => void;
	setDisabled: (index: string, state: boolean) => void;
};
export type OnChange = (
	allValues: Record<string, string>,
	lastInputInfo: { index: string; value: string; focused: boolean },
	methods: ProvidedMethods
) => void;

export type GetRenderedItems = (
	components: ProvidedComponents,
	allValues: Record<string, string>
) => Block[];

export interface Props {
	readonly: boolean;
	valid: boolean;
	deleteOnHide: boolean;
	onJSError: (e: Error) => void;
	getRenderedItems: GetRenderedItems;
	onChange: OnChange;
	initialValues: Record<string, string>;
	events: Partial<{
		error: ValidityEvent;
		valid: ValidityEvent;
		hide: VisibilityEvent;
		show: VisibilityEvent;
	}>;
	classes: {
		input: string;
		label: string;
		invalid: string;
		block: string;
	};
}
