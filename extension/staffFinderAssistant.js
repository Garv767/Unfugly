// staffFinderAssistant.js
// Runs only on https://www.srmist.edu.in/staff-finder/*

(function () {
    /**
     * Waits for an element matching the selector to appear in the DOM.
     * @param {string} selector
     * @param {number} timeout
     * @returns {Promise<HTMLElement>}
     */
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                    observer.disconnect();
                }
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`[Unfugly] Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    const params = new URLSearchParams(window.location.search);
    const faculty = params.get('unfugly_faculty');
    
    if (faculty) {
        console.log(`[Unfugly] Auto-populating staff finder search for: "${faculty}"`);
        waitForElement('input[name="faculty"]')
            .then(input => {
                input.value = faculty;
                return waitForElement('button.submit_button');
            })
            .then(btn => {
                console.log(`[Unfugly] Auto-submitting staff finder search...`);
                btn.click();
            })
            .catch(err => {
                console.warn(err.message);
            });
    }
})();
