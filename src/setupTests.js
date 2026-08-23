import "@testing-library/jest-dom";

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
