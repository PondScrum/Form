import { tick, untrack } from 'svelte';
import tippy, {
	createSingleton,
	type CreateSingletonInstance,
	type Instance,
	type Props
} from 'tippy.js';
export type TooltipParams = {
	content: false | string;
	trigger: string;
	focused: boolean;
	placement: string;
	duration: number;
	animation: string;
	inertia: boolean;
	disabled: boolean;
	hideOnClick: boolean;
};
const niceHTML = (c) =>
	c && `<h1 class="text-xs xl:text-lg capitalize py-1 tracking-tight">${c}</h1>`;

function handleOptions(options) {
	const extraProps = ['disabled', 'focused', 'cursor', 'id', 'delay', 'hide'];
	let rest = {};
	if (options.allowHTML && options.content && options.content[0] !== '<') {
		options.content = niceHTML(options.content);
	}
	options.hideOnClick = false;
	extraProps.forEach((e) => {
		rest[e] = options[e];
		delete options[e as keyof TooltipParams];
	});
	return [options, rest];
}

export function tooltip(element: HTMLElement, getOptions: () => TooltipParams) {
	let showingTimeout;
	let showing = false;
	const op = getOptions();
	const tooltip = tippy(element, op);
	if (!op.content) {
		tooltip.hide();
	}
	const show = (t, delay) => {
		if (showingTimeout) return;
		if (!delay || showing) {
			t.show();
			return;
		}
		showingTimeout = setTimeout(() => {
			t.show();
			showingTimeout = undefined;
			showing = true;
		}, delay[0]);
	};
	$effect(() => {
		const [tippyOptions, { focused, disabled, hide, delay, id }] = handleOptions(getOptions());
		tooltip.setProps(tippyOptions);
		if (hide) {
			tooltip.hide();
			return;
		}
		if (disabled) tooltip.disable();
		if (tippyOptions.content && !focused && !hide) {
			show(tooltip, delay);
		} else {
			showing = false;
			tooltip.hide();
		}
	});
	return { destroy: tooltip.destroy };
}

//---------- singleton ---------------//
//

let singletonTracker = {};
function createNewInstance(items, options, onHidden) {
	return createSingleton(
		items,
		Object.assign(
			{
				onHidden,
				duration: 75,
				animation: 'scale-subtle',
				inertia: true,
				allowHTML: true,
				placement: 'left',
				moveTransition: 'transform 0.2s ease-out',
				zIndex: 9999
			},
			options || {}
		)
	);
}
let runningNextTick = {};

function onceATick(id) {
	if (runningNextTick[id]) return;
	runningNextTick[id] = true;
	tick().then(() => {
		runningNextTick[id] = false;
		const info = singletonTracker[id];
		Object.values(singletonTracker[id]?.instanceMap || {}).forEach((e) => {
			e.instance.destroy();
		});
		singletonTracker[id].instance?.hide();
		const items = Object.entries(info.options).map(([singleId, e]) => {
			const instance = tippy(singletonTracker[id].elems[singleId], e);
			info.instanceMap[instance.id] = { index: singleId, instance };
			return instance;
		});
		singletonTracker[id].instance.setInstances(items);
	});
}

export function createSingletonTooltip(id, options = {}, onHide = () => {}) {
	let { destroy, onTooltipHidden, ...tippyOptions } = options;

	const onHidden = (args) => {
		let deleted = false;
		Object.keys(singletonTracker[id].toDelete || {}).forEach((e) => {
			delete singletonTracker[id].options[e];
			deleted = true;
		});
		singletonTracker[id].toDelete = {};
		onHide(args);
		deleted && onceATick(id);
	};

	singletonTracker[id] = {
		options: {},
		elems: {},
		instanceMap: {},
		instance: createNewInstance([], tippyOptions, onHidden)
	};

	return {
		singleton: singletonTracker[id].instance,
		singleton_tooltip: (element, op) => {
			if (typeof op !== 'function') return;
			const info = singletonTracker[id];
			$effect(() => {
				if (!info?.options) return;
				let options = op();
				if (!options.content) {
					info.toDelete ??= {};
					info.toDelete[options.id] = true;
					info.instance.hide();
					return;
				} else {
					if (info.toDelete?.[options.id]) {
						delete info.toDelete[options.id];
					}
					info.elems[options.id] = element;
					info.options[options.id] = options;
				}
				delete options.id;
				onceATick(id, onHide);
				return () => {
					if (!destroy || !info) return;
					info.instance.destroy();
					delete singletonTracker[id];
				};
			});
		}
	};
}
