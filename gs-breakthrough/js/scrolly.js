// Simple Scrollytelling Logic using IntersectionObserver
class Scrolly {
    constructor(containerSelector, stepSelector, callback) {
        this.container = document.querySelector(containerSelector);
        this.steps = document.querySelectorAll(stepSelector);
        this.callback = callback;
        this.observer = null;
        this.currentStep = -1;
        this.init();
    }

    init() {
        if (!this.container || this.steps.length === 0) return;

        // Sticky Polyfill logic not needed for modern browsers usually, but good to know.

        // Observer config
        const config = {
            root: null, // viewport
            rootMargin: '-50% 0px -50% 0px', // Trigger when element is in middle of screen
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const stepIndex = +entry.target.dataset.step;

                    // Only trigger if changing steps
                    if (this.currentStep !== stepIndex) {
                        this.currentStep = stepIndex;

                        // Update active class
                        this.steps.forEach(s => s.classList.remove('is-active'));
                        entry.target.classList.add('is-active');

                        // Callback
                        this.callback(stepIndex);
                    }
                }
            });
        }, config);

        this.steps.forEach(step => this.observer.observe(step));
    }
}
