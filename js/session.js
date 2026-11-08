/**
 * UI preferences, images, and current round.
 * @typedef {Object} SessionState
 * @property {"light" | "dark"} theme
 * @property {"de" | "en"} language
 * @property {Game} game
 * @property {GameImage[]} images - Images in playback order.
 * @property {number} imageIndex - Active image index; zero for an empty series.
 * @property {"idle" | "loading"} upload - Whether importing or activating an image.
 * @property {string} message - Translation key overriding the round message, or empty.
 * @property {boolean} error
 */
const Session = (() => {
    'use strict';

    const Theme = Object.freeze({LIGHT: 'light', DARK: 'dark'});
    const UploadState = Object.freeze({IDLE: 'idle', LOADING: 'loading'});

    /**
     * @param {SessionState["theme"]} theme - Initial light or dark appearance.
     * @param {SessionState["language"]} [language] - Initial UI language; defaults to English.
     * @returns {SessionState} Session with the given preferences.
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
     * @param {SessionState} session - Current session.
     * @param {SessionState["theme"]} theme - Requested light or dark appearance.
     * @returns {SessionState} Session with the new theme and any session error cleared.
     * Unchanged for the current valid theme; invalid themes set a session error.
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
     * @param {SessionState} session - Current session.
     * @param {SessionState["language"]} language - Requested UI language.
     * @returns {SessionState} Session with the new language and any session error cleared.
     * Unchanged for the current valid language; invalid languages set a session error.
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
     * @param {SessionState} session - Current session.
     * @param {File[]} files - New selection; individual files are validated by the loader.
     * @returns {SessionState} Loading session with playback paused and the old images retained.
     * Unchanged while loading; an empty selection sets a session error.
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
     * @param {SessionState} session - Loading session awaiting the images.
     * @param {GameImage[]} images - Images in playback order.
     * @returns {SessionState} Session starting at the first image, hidden and paused.
     * Invalid metadata ends loading with an error and retains the old images; unchanged if not loading.
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
     * @param {SessionState} session - Loading session whose committed images and round are retained.
     * @param {string} message - Translation key describing the failure.
     * @returns {SessionState} Session with an error, retaining its images and round; unchanged if not loading.
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
     * @param {SessionState} session - Current session.
     * @param {number} index - Target index in the images.
     * @returns {SessionState} Loading session with the old round paused and retained.
     * Unchanged while loading or already at the target; invalid indices set a session error.
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
     * @param {SessionState} session - Loading session awaiting activation of an existing image.
     * @param {number} index - Index of the image.
     * @returns {SessionState} Session with the selected image reset and paused.
     * Invalid indices end loading with an error; unchanged if not loading.
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
     * @param {SessionState} session - Session supplying the active position and images.
     * @param {-1 | 1} direction - Previous (-1) or next (1) image.
     * @returns {number} Target index, wrapping at either end;
     * the current index when fewer than two images exist.
     */
    function adjacentImageIndex(session, direction) {
        const imageCount = session.images.length;
        if (imageCount <= 1) {
            return session.imageIndex;
        }
        return (session.imageIndex + direction + imageCount) % imageCount;
    }

    /**
     * @param {SessionState} session - Current session.
     * @param {(game: Game) => Game} transform - Pure round state transformation.
     * @returns {SessionState} Session containing the transformed round with session messages cleared.
     * Unchanged while loading or if the transformation returns the same round.
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
