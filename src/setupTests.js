import '@testing-library/jest-dom';

class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
}

if (typeof window !== 'undefined') {
    window.IntersectionObserver = MockIntersectionObserver;
}
