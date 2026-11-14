/**
 * A translated user notification.
 * @typedef {Object} NotificationMessage
 * @property {string} key - Translation key.
 * @property {boolean} error
 */
const Notification = (() => {
    'use strict';

    /**
     * @param {string} key - Translation key.
     * @returns {NotificationMessage} Informational notification.
     */
    function info(key) {
        return {key, error: false};
    }

    /**
     * @param {string} key - Translation key.
     * @returns {NotificationMessage} Error notification.
     */
    function error(key) {
        return {key, error: true};
    }

    return Object.freeze({info, error});
})();
