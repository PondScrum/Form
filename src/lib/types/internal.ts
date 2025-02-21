import type { Snippet, SvelteComponent } from 'svelte';
export type { Props } from './public';

export type AdditionalInputProps = {
	key: string;
	input: {
		class: string;
	};
	label: {
		class: string;
		alias: string;
		html: string;
		hide?: true;
	};
	col?: true;
	readonly?: true;
};

export type InputComponentPublicFns = SvelteComponent<Record<string, (value: string) => void>>;

export type InputProps = { index: string; inputType: string } & AdditionalInputProps;

export type VisibilityEvent = (index: string) => void;
export type ValidityEvent = (index: string, value: string) => void;

export type DataToAssign = string;
export type TooltipMessage = string;
export type Validate = (
	value: string,
	focused: boolean
) => { valid: true; data: DataToAssign } | { valid: false; data: TooltipMessage };

export type RenderType = 'group' | 'block';
export type GroupType = 'row' | 'col';
export type Block =
	| undefined
	| { renderType: 'block'; props: InputProps; component: Snippet }
	| { renderType: 'group'; type: GroupType; blocks: Block[] };
export type SelectOptions = Record<string, string>;

export type StandardInput = (index: string, validate: Validate, props: AdditionalProps) => Block;
export type OptionInput = (
	index: string,
	validate: Validate,
	options: SelectOptions,
	props: AdditionalProps
) => Block;

export type Match = (value: boolean | string, block: Block | Block[]) => (index: string) => Block[];

export type Pivot = (index: string, ...Match: ReturnType<Match>[]) => Block;

export type Group = (...blocks: Block[]) => Block;
export type ProvidedComponents = {
	Text: StandardInput;
	Select: OptionInput;
	Date: StandardInput;
	InlineSelect: OptionInput;
	Boolean: StandardInput;
	Col: Block;
	Row: Block;
	Pivot: Pivot;
	Match: Match;
};

export type BaseBlock = { renderType: 'block'; props: InputProps; component: Snippet };
