import "@testing-library/jest-dom";

/** jsdom has no IntersectionObserver; components only need it to exist. */
class IntersectionObserverMock implements IntersectionObserver {
	readonly root = null;
	readonly rootMargin = "";
	readonly scrollMargin = "";
	readonly thresholds = [];
	constructor(readonly callback: IntersectionObserverCallback) {}
	observe() {
		// nothing to observe in jsdom
	}
	unobserve() {
		// nothing to observe in jsdom
	}
	disconnect() {
		// nothing to observe in jsdom
	}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

window.IntersectionObserver = IntersectionObserverMock;
