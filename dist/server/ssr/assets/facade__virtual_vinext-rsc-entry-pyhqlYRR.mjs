import { n as usePathname, t as getLayoutSegmentContext } from "../index.mjs";
import React, { createElement } from "react";
import { jsx } from "react/jsx-runtime";
//#region node_modules/.pnpm/vinext@0.0.39_patch_hash=pfr3zxepmy5vd2kjgf7tt6d7g4_@vitejs+plugin-react@6.0.1_vite@8.0.3_@em_m4imrq443ofzhkcjf6ifg63fvq/node_modules/vinext/dist/shims/error-boundary.js
/**
* Generic ErrorBoundary used to wrap route segments with error.tsx.
* This must be a client component since error boundaries use
* componentDidCatch / getDerivedStateFromError.
*/
var ErrorBoundary = class extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	static getDerivedStateFromError(error) {
		if (error && typeof error === "object" && "digest" in error) {
			const digest = String(error.digest);
			if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;") || digest.startsWith("NEXT_REDIRECT;")) throw error;
		}
		return { error };
	}
	reset = () => {
		this.setState({ error: null });
	};
	render() {
		if (this.state.error) {
			const FallbackComponent = this.props.fallback;
			return /* @__PURE__ */ jsx(FallbackComponent, {
				error: this.state.error,
				reset: this.reset
			});
		}
		return this.props.children;
	}
};
/**
* Inner class component that catches notFound() errors and renders the
* not-found.tsx fallback. Resets when the pathname changes (client navigation)
* so a previous notFound() doesn't permanently stick.
*
* The ErrorBoundary above re-throws notFound errors so they propagate up to this
* boundary. This must be placed above the ErrorBoundary in the component tree.
*/
var NotFoundBoundaryInner = class extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			notFound: false,
			previousPathname: props.pathname
		};
	}
	static getDerivedStateFromProps(props, state) {
		if (props.pathname !== state.previousPathname && state.notFound) return {
			notFound: false,
			previousPathname: props.pathname
		};
		return {
			notFound: state.notFound,
			previousPathname: props.pathname
		};
	}
	static getDerivedStateFromError(error) {
		if (error && typeof error === "object" && "digest" in error) {
			const digest = String(error.digest);
			if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) return { notFound: true };
		}
		throw error;
	}
	render() {
		if (this.state.notFound) return this.props.fallback;
		return this.props.children;
	}
};
/**
* Wrapper that reads the current pathname and passes it to the inner class
* component. This enables automatic reset on client-side navigation.
*/
function NotFoundBoundary({ fallback, children }) {
	return /* @__PURE__ */ jsx(NotFoundBoundaryInner, {
		pathname: usePathname(),
		fallback,
		children
	});
}
//#endregion
//#region node_modules/.pnpm/vinext@0.0.39_patch_hash=pfr3zxepmy5vd2kjgf7tt6d7g4_@vitejs+plugin-react@6.0.1_vite@8.0.3_@em_m4imrq443ofzhkcjf6ifg63fvq/node_modules/vinext/dist/shims/layout-segment-context.js
/**
* Layout segment context provider.
*
* Must be "use client" so that Vite's RSC bundler renders this component in
* the SSR/browser environment where React.createContext is available. The RSC
* entry imports and renders LayoutSegmentProvider directly, but because of the
* "use client" boundary the actual execution happens on the SSR/client side
* where the context can be created and consumed by useSelectedLayoutSegment(s).
*
* Without "use client", this runs in the RSC environment where
* React.createContext is undefined, getLayoutSegmentContext() returns null,
* the provider becomes a no-op, and useSelectedLayoutSegments always returns [].
*
* The context is shared with navigation.ts via getLayoutSegmentContext()
* to avoid creating separate contexts in different modules.
*/
/**
* Wraps children with the layout segment context.
*
* Each layout in the App Router tree wraps its children with this provider,
* passing a map of parallel route key to segment path. The "children" key is
* always present (the default parallel route). Named parallel slots at this
* layout level add their own keys.
*
* Components inside the provider call useSelectedLayoutSegments(parallelRoutesKey)
* to read the segments for a specific parallel route.
*/
function LayoutSegmentProvider({ segmentMap, children }) {
	const ctx = getLayoutSegmentContext();
	if (!ctx) return children;
	return createElement(ctx.Provider, { value: segmentMap }, children);
}
//#endregion
//#region \0virtual:vite-rsc/client-references/group/facade:\0virtual:vinext-rsc-entry
var export_f29e6e234fea = {
	ErrorBoundary,
	NotFoundBoundary
};
var export_0deffcb8ffd7 = { LayoutSegmentProvider };
//#endregion
export { export_0deffcb8ffd7, export_f29e6e234fea };
