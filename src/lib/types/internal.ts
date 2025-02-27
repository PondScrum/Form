import type { Component, Snippet, SvelteComponent } from 'svelte';
import type { PublicInputProps } from './public';
export type { Props } from './public';
export type { AllValues, OptionInput, StandardInput, ProvidedComponents } from './public';

export type Index = string | string[];

export type InputComponentPublicFns = SvelteComponent<Record<string, (value: string) => void>>;

export type ChangeResponse = {
	valid: boolean;
	value: string;
	tooltip: string;
	background_color: string;
};
export type ValueChanged = (value: string, focused: boolean) => ChangeResponse;

export type InputProps = {
	options?: SelectOptions;
	index: string;
	inputType: string;
	initialValue: string;
	id: string;
	valueChanged: ValueChanged;
	publicIndex: string | string[];
} & PublicInputProps;

export type VisibilityEvent = (index: Index) => void;
export type ValidityEvent = (index: Index, value: string) => void;

export type DataToAssign = string;
export type TooltipMessage = string;
export type Validate = (
	value: string,
	focused: boolean
) => { valid: true; data: DataToAssign } | { valid: false; data: TooltipMessage };

export type RenderType = 'group' | 'block';

export type GroupType = 'row' | 'col';

export type Classes = {
	header: string;
	group: string;
	input: string;
	label: string;
	invalid: string;
	block: string;
	border: string;
};
export type InternalInputProps = InputProps;
export type BlockSpec = {
	renderType: 'block';
	props: InternalInputProps;
	component: Component<any>;
};
export type GroupSpec = { renderType: 'group'; type: GroupType; blocks: RenderArrItems };

export type RenderArrItems = Block[];

export type Block = BlockSpec | GroupSpec;

export type SelectOptions = Record<string, string>;

export type Match = (value: boolean | string, block: Block | Block[]) => (index: string) => Block[];

export type Pivot = (index: string, ...Match: ReturnType<Match>[]) => RenderArrItems;

export type Group = (...blocks: Block[]) => Block;
