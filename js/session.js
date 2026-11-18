/**
 * Selected images and the active position.
 * @typedef {Object} ImageSelection
 * @property {GameImage[]} images - Selected images, in order.
 * @property {number} index - Active image index; zero if no images are selected.
 */

/**
 * User preferences.
 * @typedef {Object} Preferences
 * @property {"light" | "dark"} theme
 * @property {Language} language
 * @property {boolean} randomImportOrder
 * @property {boolean} progressAsPercent
 */

/**
 * App preferences, selected images, and current game.
 * @typedef {Object} SessionState
 * @property {Preferences} preferences
 * @property {Game} game
 * @property {ImageSelection} selection
 * @property {"idle" | "loading"} upload - Whether images are being loaded or changed.
 * @property {NotificationMessage | null} notification - Overrides the game notification when present.
 */
const Session = (() => {
    'use strict';

    const Theme = Object.freeze({LIGHT: 'light', DARK: 'dark'});
    const UploadState = Object.freeze({IDLE: 'idle', LOADING: 'loading'});

    /**
     * @param {Preferences["theme"]} theme - Initial theme.
     * @param {Language} [language] - Initial language; defaults to English.
     * @returns {SessionState} New session with the given preferences.
     */
    function createSession(theme, language = I18n.Language.EN) {
        return {
            preferences: {
                theme,
                language,
                randomImportOrder: false,
                progressAsPercent: false,
            },
            game: GameEngine.createGame(),
            selection: {images: [], index: 0},
            upload: UploadState.IDLE,
            notification: null,
        };
    }

    /**
     * @param {SessionState} session
     * @param {Preferences["theme"]} theme - New theme.
     * @returns {SessionState} Session with the new theme; invalid themes set an error.
     */
    function changeTheme(session, theme) {
        if (!Object.values(Theme).includes(theme)) {
            return {...session, notification: Notification.error('error.theme')};
        }
        if (theme === session.preferences.theme && !session.notification?.error) {
            return session;
        }
        return {
            ...session,
            preferences: {...session.preferences, theme},
            notification: session.notification?.error ? null : session.notification,
        };
    }

    /**
     * @param {SessionState} session
     * @param {Language} language - New language.
     * @returns {SessionState} Session with the new language; invalid languages set an error.
     */
    function changeLanguage(session, language) {
        if (!Object.values(I18n.Language).includes(language)) {
            return {...session, notification: Notification.error('error.language')};
        }
        if (language === session.preferences.language && !session.notification?.error) {
            return session;
        }
        return {
            ...session,
            preferences: {...session.preferences, language},
            notification: session.notification?.error ? null : session.notification,
        };
    }

    /**
     * @param {SessionState} session
     * @returns {SessionState} Session with the order for future imports toggled.
     */
    function toggleImportOrder(session) {
        if (session.upload === UploadState.LOADING) {
            return session;
        }
        return {
            ...session,
            preferences: {...session.preferences, randomImportOrder: !session.preferences.randomImportOrder},
        };
    }

    /**
     * @param {SessionState} session
     * @returns {SessionState} Session with the progress display format toggled.
     */
    function toggleProgressFormat(session) {
        return {
            ...session,
            preferences: {...session.preferences, progressAsPercent: !session.preferences.progressAsPercent},
        };
    }

    /**
     * @param {SessionState} session
     * @param {File[]} files - Selected files.
     * @returns {SessionState} Loading session with automatic reveal paused;
     * an empty selection sets an error.
     */
    function beginUpload(session, files) {
        if (session.upload === UploadState.LOADING) {
            return session;
        }
        if (!files || files.length === 0) {
            return {...session, notification: Notification.error('error.file-count')};
        }
        return {
            ...session,
            game: GameEngine.pauseGame(session.game),
            upload: UploadState.LOADING,
            notification: Notification.info('message.images-preparing'),
        };
    }

    /**
     * @param {SessionState} session
     * @param {GameImage[]} images - Loaded images, in order.
     * @returns {SessionState} Session showing the first image with its game reset and paused;
     * invalid images set an error.
     */
    function finishUpload(session, images) {
        if (session.upload !== UploadState.LOADING) {
            return session;
        }
        if (!images || images.length === 0 || !images.every(GameEngine.isValidImage)) {
            return failImageLoading(session, 'error.upload-decode');
        }
        return {
            ...session,
            selection: {
                images: images.map((image) => ({...image})),
                index: 0,
            },
            game: GameEngine.loadImage(session.game, images[0]),
            upload: UploadState.IDLE,
            notification: null,
        };
    }

    /**
     * @param {SessionState} session
     * @param {string} message - Error translation key.
     * @returns {SessionState} Session with an error; unchanged if it is not loading.
     */
    function failImageLoading(session, message) {
        if (session.upload !== UploadState.LOADING) {
            return session;
        }
        return {
            ...session,
            upload: UploadState.IDLE,
            notification: Notification.error(message),
        };
    }

    /**
     * @param {SessionState} session
     * @param {number} index - Index of the image to activate.
     * @returns {SessionState} Loading session with the current game paused;
     * invalid indices set an error.
     */
    function beginImageChange(session, index) {
        if (session.upload === UploadState.LOADING || index === session.selection.index) {
            return session;
        }
        if (!Number.isInteger(index) || index < 0 || index >= session.selection.images.length) {
            return {...session, notification: Notification.error('error.image-index')};
        }
        return {
            ...session,
            game: GameEngine.pauseGame(session.game),
            upload: UploadState.LOADING,
            notification: Notification.info('message.image-loading'),
        };
    }

    /**
     * @param {SessionState} session
     * @param {number} index - Index of the image to activate.
     * @returns {SessionState} Session showing the selected image with its game reset and paused;
     * invalid indices set an error.
     */
    function finishImageChange(session, index) {
        if (session.upload !== UploadState.LOADING) {
            return session;
        }
        if (!Number.isInteger(index) || index < 0 || index >= session.selection.images.length) {
            return failImageLoading(session, 'error.image-index');
        }
        return {
            ...session,
            selection: {...session.selection, index},
            game: GameEngine.loadImage(session.game, session.selection.images[index]),
            upload: UploadState.IDLE,
            notification: null,
        };
    }

    /**
     * @param {SessionState} session
     * @param {-1 | 1} direction - Previous (-1) or next (1).
     * @returns {number} Next image index, wrapping at either end.
     */
    function adjacentImageIndex(session, direction) {
        const imageCount = session.selection.images.length;
        if (imageCount <= 1) {
            return session.selection.index;
        }
        return (session.selection.index + direction + imageCount) % imageCount;
    }

    /**
     * @param {SessionState} session
     * @param {(game: Game) => Game} transform - Game state update.
     * @returns {SessionState} Session with the updated game;
     * unchanged while loading or if the game is unchanged.
     */
    function applyGameChange(session, transform) {
        if (session.upload === UploadState.LOADING) {
            return session;
        }
        const game = transform(session.game);
        if (game === session.game) {
            return session;
        }
        return {...session, game, notification: null};
    }

    return Object.freeze({
        Theme,
        UploadState,
        createSession,
        changeTheme,
        changeLanguage,
        toggleImportOrder,
        toggleProgressFormat,
        beginUpload,
        finishUpload,
        failImageLoading,
        beginImageChange,
        finishImageChange,
        adjacentImageIndex,
        applyGameChange,
    });
})();
