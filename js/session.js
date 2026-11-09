/**
 * App preferences, selected images, and current game.
 * @typedef {Object} SessionState
 * @property {"light" | "dark"} theme
 * @property {"de" | "en"} language
 * @property {Game} game
 * @property {GameImage[]} images - Selected images, in order.
 * @property {number} imageIndex - Active image index; zero if no images are selected.
 * @property {"idle" | "loading"} upload - Whether images are being loaded or changed.
 * @property {string} message - Translation key overriding the game message, or empty.
 * @property {boolean} error
 */
const Session = (() => {
    'use strict';

    const Theme = Object.freeze({LIGHT: 'light', DARK: 'dark'});
    const UploadState = Object.freeze({IDLE: 'idle', LOADING: 'loading'});

    /**
     * @param {SessionState["theme"]} theme - Initial theme.
     * @param {SessionState["language"]} [language] - Initial language; defaults to English.
     * @returns {SessionState} New session with the given preferences.
     */
    function createSession(theme, language = I18n.Language.EN) {
        return {
            theme,
            language,
            game: GameEngine.createGame(),
            images: [],
            imageIndex: 0,
            upload: UploadState.IDLE,
            message: '',
            error: false,
        };
    }

    /**
     * @param {SessionState} session
     * @param {SessionState["theme"]} theme - New theme.
     * @returns {SessionState} Session with the new theme; invalid themes set an error.
     */
    function changeTheme(session, theme) {
        if (!Object.values(Theme).includes(theme)) {
            return {...session, message: 'error.theme', error: true};
        }
        if (theme === session.theme && !session.error) {
            return session;
        }
        return {...session, theme, message: session.error ? '' : session.message, error: false};
    }

    /**
     * @param {SessionState} session
     * @param {SessionState["language"]} language - New language.
     * @returns {SessionState} Session with the new language; invalid languages set an error.
     */
    function changeLanguage(session, language) {
        if (!Object.values(I18n.Language).includes(language)) {
            return {...session, message: 'error.language', error: true};
        }
        if (language === session.language && !session.error) {
            return session;
        }
        return {...session, language, message: session.error ? '' : session.message, error: false};
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
            return {...session, message: 'error.fileCount', error: true};
        }
        return {
            ...session,
            game: GameEngine.pauseGame(session.game),
            upload: UploadState.LOADING,
            message: 'message.preparing',
            error: false,
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
            return failImageLoading(session, 'error.uploadDecode');
        }
        return {
            ...session,
            images: images.map((image) => ({...image})),
            imageIndex: 0,
            game: GameEngine.loadImage(session.game, images[0]),
            upload: UploadState.IDLE,
            message: '',
            error: false,
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
            message,
            error: true,
        };
    }

    /**
     * @param {SessionState} session
     * @param {number} index - Index of the image to activate.
     * @returns {SessionState} Loading session with the current game paused;
     * invalid indices set an error.
     */
    function beginImageChange(session, index) {
        if (session.upload === UploadState.LOADING || index === session.imageIndex) {
            return session;
        }
        if (!Number.isInteger(index) || index < 0 || index >= session.images.length) {
            return {...session, message: 'error.imageIndex', error: true};
        }
        return {
            ...session,
            game: GameEngine.pauseGame(session.game),
            upload: UploadState.LOADING,
            message: 'message.loading',
            error: false,
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
        if (!Number.isInteger(index) || index < 0 || index >= session.images.length) {
            return failImageLoading(session, 'error.imageIndex');
        }
        return {
            ...session,
            imageIndex: index,
            game: GameEngine.loadImage(session.game, session.images[index]),
            upload: UploadState.IDLE,
            message: '',
            error: false,
        };
    }

    /**
     * @param {SessionState} session
     * @param {-1 | 1} direction - Previous (-1) or next (1).
     * @returns {number} Next image index, wrapping at either end.
     */
    function adjacentImageIndex(session, direction) {
        const imageCount = session.images.length;
        if (imageCount <= 1) {
            return session.imageIndex;
        }
        return (session.imageIndex + direction + imageCount) % imageCount;
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
        return {...session, game, message: '', error: false};
    }

    return Object.freeze({
        Theme,
        UploadState,
        createSession,
        changeTheme,
        changeLanguage,
        beginUpload,
        finishUpload,
        failImageLoading,
        beginImageChange,
        finishImageChange,
        adjacentImageIndex,
        applyGameChange,
    });
})();
