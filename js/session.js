/**
 * @typedef {Object} SessionState
 * @property {"light" | "dark"} theme
 * @property {"de" | "en"} language
 * @property {Game} game
 * @property {"idle" | "loading"} upload
 * @property {string} message
 * @property {boolean} error
 */
const Session = (() => {
    'use strict';

    const Theme = Object.freeze({LIGHT: 'light', DARK: 'dark'});
    const UploadState = Object.freeze({IDLE: 'idle', LOADING: 'loading'});

    /**
     * @param {SessionState["theme"]} theme
     * @param {SessionState["language"]} [language]
     * @returns {SessionState}
     */
    function createSession(theme, language = I18n.Language.EN) {
        return {
            theme,
            language,
            game: GameEngine.createGame(),
            upload: UploadState.IDLE,
            message: '',
            error: false,
        };
    }

    /**
     * @param {SessionState} session
     * @param {SessionState["theme"]} theme
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
     * @param {SessionState["language"]} language
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
     * @param {File[]} files
     */
    function beginUpload(session, files) {
        if (session.upload === UploadState.LOADING) {
            return session;
        }
        if (!files || files.length !== 1) {
            return {...session, message: 'error.fileCount', error: true};
        }
        const file = files[0];
        if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
            return {...session, message: 'error.fileType', error: true};
        }
        return {
            ...session,
            upload: UploadState.LOADING,
            message: 'message.preparing',
            error: false,
        };
    }

    /**
     * @param {SessionState} session
     * @param {GameImage} image
     */
    function finishUpload(session, image) {
        if (session.upload !== UploadState.LOADING) {
            return session;
        }
        return {
            ...session,
            game: GameEngine.loadImage(session.game, image),
            upload: UploadState.IDLE,
            message: '',
            error: false,
        };
    }

    /** @param {SessionState} session */
    function failUpload(session) {
        if (session.upload !== UploadState.LOADING) {
            return session;
        }
        return {
            ...session,
            upload: UploadState.IDLE,
            message: 'error.fileDecode',
            error: true,
        };
    }

    /**
     * @param {SessionState} session
     * @param {(game: Game) => Game} transform
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
        failUpload,
        applyGameChange,
    });
})();
