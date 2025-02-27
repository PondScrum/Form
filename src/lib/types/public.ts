import type { TransitionConfig } from 'svelte/transition';
import type {
	Block,
	ValidityEvent,
	VisibilityEvent,
	Index,
	Classes,
	BlockSpec,
	Validate,
	SelectOptions,
	GroupSpec,
	Pivot,
	Match
} from './internal';
import type { HTMLInputAttributes } from 'svelte/elements';

export type ProvidedMethods = {
	setInternalValue: (index: Index, valid: string) => void;
	setDisabled: (index: Index, state: boolean) => void;
};
export type OnChange = (
	allValues: AllValues,
	lastInputInfo: { index: Index; value: string; focused: boolean },
	methods: ProvidedMethods
) => void;

export type GetRenderedItems = (components: ProvidedComponents, allValues: AllValues) => Block[];

export type AllValues = {
	[x: string]: AllValues | string;
};

export interface Props {
	readonly?: boolean;
	valid: boolean;
	deleteOnHide?: boolean;
	onJSError: (e: Error) => void;
	getRenderedItems: GetRenderedItems;
	onChange: OnChange;
	initialValues?: AllValues;
	events: Partial<{
		error: ValidityEvent;
		valid: ValidityEvent;
		hide: VisibilityEvent;
		show: VisibilityEvent;
	}>;
	classes?: Partial<Classes>;
	globalKey?: string;
	svelteTransition?: (element: HTMLElement) => TransitionConfig;
}

type WrapperProps = Partial<{
	class: string;
	alias: string;
	hide: boolean;
	additionalClass: string;
}>;

export type PublicInputProps = {
	key: string;
	input: WrapperProps & {
		elementAttributes?: HTMLInputAttributes; //HTMLInputAttributes
	};
	label: WrapperProps & {
		html?: string;
	};
	readonly: boolean;
	row: boolean;
};

export type InputProps = Partial<PublicInputProps>;

export type StandardInput = (index: string, validate: Validate, props?: InputProps) => BlockSpec;

export type OptionInput = (
	index: string,
	validate: Validate,
	options: SelectOptions,
	props?: InputProps
) => Block;
export type ProvidedComponents = {
	Time: StandardInput;
	Text: StandardInput;
	Select: OptionInput;
	Date: StandardInput;
	TextArea: StandardInput;
	InlineSelect: OptionInput;
	NestIndex: (...indexes: string[])=>string;
	Boolean: StandardInput;
	Col: (...items: (Block | Block[])[]) => GroupSpec;
	Row: (...items: (Block | Block[])[]) => GroupSpec;
	Pivot: Pivot;
	Match: Match;
};
