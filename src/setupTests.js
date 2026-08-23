import "@testing-library/jest-dom";

// Backend suites opt into the node environment, where there is no window to
// patch — the DOM mock below only applies to the jsdom (frontend) suites.
if (typeof window !== "undefined") {
	window.IntersectionObserver = class IntersectionObserver {
		constructor(callback) {
			this.callback = callback;
			this.trigger = (entries) => {
				this.callback(entries, this);
			};
		}

		observe() {
			/* Intentionally empty mock */
		}

		unobserve() {
			/* Intentionally empty mock */
		}

		disconnect() {
			/* Intentionally empty mock */
		}
	};
}
