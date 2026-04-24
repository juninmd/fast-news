import '@testing-library/jest-dom';

class IntersectionObserverMock {
    constructor(callback) {
        this.callback = callback;
    }
    observe(element) {
        this.element = element;
        // Automatically trigger intersection to simulate being visible initially
        setTimeout(() => {
            this.callback([{ isIntersecting: true, target: this.element }]);
        }, 0);
    }
    unobserve() {}
    disconnect() {}
}

global.IntersectionObserver = IntersectionObserverMock;
