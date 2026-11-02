(() => {
    'use strict';

    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'})
            .catch((error) => {
                console.error('Error during service worker registration:', error);
            });
    });
})();
