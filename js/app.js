(() => {
    'use strict';

    const NOTIFICATION_DURATION_MS = 3000;
    const ERROR_NOTIFICATION_DURATION_MS = 6000;

    const elements = Object.fromEntries([
        'app-version', 'theme', 'language',
        'drop-zone', 'file-input',
        'mode-description',
        'grid-settings', 'rows', 'columns', 'grid-mode-description',
        'effect-settings', 'effect', 'effect-steps', 'effect-steps-text',
        'automatic-settings', 'interval-name', 'interval', 'interval-text',
        'notification', 'message',
        'empty-board', 'board-area', 'board-frame', 'column-labels', 'row-labels',
        'board', 'image', 'swirl-canvas', 'tiles', 'distort-map',
        'image-navigation', 'previous-button', 'image-position', 'next-button',
        'play-button', 'reveal-button', 'reset-button',
    ].map((id) => [id, document.getElementById(id)]));

    const modeInputs = document.querySelectorAll('input[name="mode"]');
    const gridModeInputs = document.querySelectorAll('input[name="grid-mode"]');

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? Session.Theme.DARK
        : Session.Theme.LIGHT;
    const browserLanguage = navigator.language.toLowerCase();
    const systemLanguage = browserLanguage === 'de' || browserLanguage.startsWith('de-')
        ? I18n.Language.DE
        : I18n.Language.EN;
    let session = Session.createSession(systemTheme, systemLanguage);
    let timer = null;
    let notificationTimer = null;
    let pixelCache = null;

    /**
     * Applies a session update and refreshes the UI only when it changes.
     * @param {(session: SessionState) => SessionState} transform - Session state update.
     * @returns {void}
     */
    function updateSession(transform) {
        const previousSession = session;
        session = transform(previousSession);
        if (session === previousSession) {
            return;
        }
        render(session, previousSession);
        syncTimer(session.game, previousSession.game);
    }

    /**
     * Applies a game update unless images are loading.
     * @param {(game: Game) => Game} transform - Game state update.
     * @returns {void}
     */
    function updateGame(transform) {
        updateSession((currentSession) => Session.applyGameChange(currentSession, transform));
    }

    /**
     * Updates the automatic reveal timer when its state or interval changes.
     * @param {Game} currentGame - Game after the update.
     * @param {Game} previousGame - Game before the update.
     * @returns {void}
     */
    function syncTimer(currentGame, previousGame) {
        if (GameEngine.isAutoRunning(currentGame) === GameEngine.isAutoRunning(previousGame) &&
            currentGame.intervalSeconds === previousGame.intervalSeconds) {
            return;
        }
        if (timer !== null) {
            window.clearInterval(timer);
        }
        timer = null;
        if (GameEngine.isAutoRunning(currentGame)) {
            timer = window.setInterval(() => {
                updateGame(GameEngine.revealNext);
            }, currentGame.intervalSeconds * 1000);
        }
    }

    /**
     * Displays the loaded app version.
     * @returns {void}
     */
    function initializeVersion() {
        elements['app-version'].textContent = `v${APP_VERSION}`;
    }

    /**
     * Populates grid selectors and slider limits from engine constants.
     * @returns {void}
     */
    function initializeControls() {
        for (let count = 1; count <= GameEngine.MAX_ROWS; count++) {
            elements['rows'].append(new Option(String(count), String(count)));
        }
        for (let count = 1; count <= GameEngine.MAX_COLUMNS; count++) {
            elements['columns'].append(new Option(String(count), String(count)));
        }
        elements['interval'].max = GameEngine.MAX_INTERVAL;
        elements['effect-steps'].min = GameEngine.MIN_EFFECT_STEPS;
        elements['effect-steps'].max = GameEngine.MAX_EFFECT_STEPS;
    }

    /**
     * Updates static UI text, document language, and accessible image/navigation labels.
     * @param {Language} language - Language for the document and UI labels.
     * @returns {void}
     */
    function renderLanguage(language) {
        document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = I18n.translate(language, element.dataset.i18n);
        });
        elements['image'].alt = I18n.translate(language, 'image.alt');
        elements['image-navigation'].setAttribute('aria-label', I18n.translate(language, 'image.navigation'));
    }

    /**
     * Builds the board for the current image and grid.
     * @param {Game} game
     * @returns {void}
     */
    function buildBoard(game) {
        elements['row-labels'].replaceChildren();
        elements['column-labels'].replaceChildren();
        elements['tiles'].replaceChildren();
        if (!game.image) {
            return;
        }

        const frame = elements['board-frame'];
        frame.style.setProperty('--rows', String(game.grid.rows));
        frame.style.setProperty('--columns', String(game.grid.columns));
        frame.style.setProperty('--aspect-ratio', String(game.image.width / game.image.height));

        for (let row = 0; row < game.grid.rows; row++) {
            const label = document.createElement('span');
            label.textContent = GameEngine.rowNumber(row);
            elements['row-labels'].append(label);
        }
        for (let column = 0; column < game.grid.columns; column++) {
            const label = document.createElement('span');
            label.textContent = GameEngine.columnLetter(column);
            elements['column-labels'].append(label);
        }
        for (let row = 0; row < game.grid.rows; row++) {
            for (let column = 0; column < game.grid.columns; column++) {
                const label = document.createElement('span');
                label.className = 'tile-label';
                label.textContent = GameEngine.tileLabel(row, column);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'tile';
                button.dataset.row = String(row);
                button.dataset.column = String(column);
                button.setAttribute('aria-label', label.textContent);
                button.append(label);
                elements['tiles'].append(button);
            }
        }
        elements['image'].src = game.image.url;
    }

    /**
     * @param {Game} game
     * @returns {boolean} Whether effect mode has the swirl effect selected.
     */
    function isSwirl(game) {
        return game.mode === GameEngine.GameMode.EFFECT &&
            game.effect.type === GameEngine.Effect.SWIRL;
    }

    /**
     * Updates the UI, rebuilding the board only when its image or grid changes.
     * @param {SessionState} currentSession - Session after the update.
     * @param {SessionState} previousSession - Session before the update.
     * @returns {void}
     */
    function render(currentSession, previousSession) {
        const currentGame = currentSession.game;
        const previousGame = previousSession.game;
        if (previousSession.language !== currentSession.language) {
            renderLanguage(currentSession.language);
        }
        if (previousGame.image !== currentGame.image ||
            previousGame.grid.rows !== currentGame.grid.rows ||
            previousGame.grid.columns !== currentGame.grid.columns) {
            buildBoard(currentGame);
        }

        renderSettings(currentSession);
        renderGame(currentGame, previousGame, currentSession.upload === Session.UploadState.LOADING);
        renderActions(currentSession);
        renderNotification(currentSession, previousSession);
    }

    /**
     * Updates preferences and game settings, disabling controls while loading.
     * @param {SessionState} session
     * @returns {void}
     */
    function renderSettings(session) {
        const game = session.game;
        const loading = session.upload === Session.UploadState.LOADING;
        const automatic = GameEngine.isAutomatic(game);
        const effectMode = game.mode === GameEngine.GameMode.EFFECT;

        document.documentElement.dataset.theme = session.theme;
        elements['theme'].value = session.theme;
        elements['language'].value = session.language;

        elements['file-input'].disabled = loading;

        modeInputs.forEach((input) => {
            input.checked = input.value === game.mode;
            input.disabled = loading;
        });
        elements['mode-description'].textContent = I18n.translate(session.language,
            `mode.${game.mode}Hint`);

        elements['grid-settings'].hidden = effectMode;
        elements['rows'].value = game.grid.rows;
        elements['columns'].value = game.grid.columns;
        elements['rows'].disabled = loading;
        elements['columns'].disabled = loading;
        gridModeInputs.forEach((input) => {
            input.checked = input.value === game.grid.mode;
            input.disabled = loading;
        });
        elements['grid-mode-description'].textContent = I18n.translate(session.language,
            `gridMode.${game.grid.mode}Hint`);
        elements['effect-settings'].hidden = !effectMode;
        elements['effect'].value = game.effect.type;
        elements['effect'].disabled = loading;
        elements['effect-steps'].disabled = loading;
        elements['effect-steps'].value = game.effect.steps;
        elements['effect-steps-text'].textContent = String(game.effect.steps);

        elements['automatic-settings'].hidden = !automatic;
        elements['interval-name'].textContent = I18n.translate(session.language,
            effectMode ? 'interval.step' : 'interval.tile');
        elements['interval'].value = game.intervalSeconds;
        elements['interval'].disabled = loading;
        elements['interval-text'].textContent = I18n.translate(session.language,
            game.intervalSeconds === 1 ? 'interval.one' : 'interval.other',
            {count: game.intervalSeconds});
    }

    /**
     * Updates tile visibility and effects, using the active pixel cache for swirl rendering.
     * @param {Game} currentGame - Game to display.
     * @param {Game} previousGame - Game before the update, used to avoid redundant swirl drawing.
     * @param {boolean} loading - Whether image processing blocks tile interaction.
     * @returns {void}
     */
    function renderGame(currentGame, previousGame, loading) {
        const effectMode = currentGame.mode === GameEngine.GameMode.EFFECT;
        const automatic = GameEngine.isAutomatic(currentGame);
        const inProgress = GameEngine.gameState(currentGame) === GameEngine.GameState.IN_PROGRESS;

        elements['board-frame'].dataset.mode = currentGame.mode;
        elements['empty-board'].hidden = currentGame.image !== null;
        elements['board-area'].hidden = currentGame.image === null;
        elements['row-labels'].hidden = effectMode;
        elements['column-labels'].hidden = effectMode;
        elements['tiles'].hidden = effectMode;
        if (!effectMode) {
            for (const button of elements['tiles'].children) {
                const row = Number(button.dataset.row);
                const column = Number(button.dataset.column);
                const hidden = GameEngine.isHidden(currentGame, row, column);
                button.classList.toggle('hidden', hidden);
                button.disabled = loading || automatic || !inProgress || !hidden;
            }
        }

        const strength = GameEngine.effectStrength(currentGame);

        elements['board'].dataset.effect = effectMode && strength > 0 ? currentGame.effect.type : 'none';
        elements['board'].style.setProperty('--strength', String(strength));
        elements['distort-map'].setAttribute('scale', String(strength * Effects.MAX_DISTORT_SCALE));
        if (currentGame.image && isSwirl(currentGame) && strength > 0 &&
            (!isSwirl(previousGame) ||
                previousGame.effect.remainingSteps !== currentGame.effect.remainingSteps ||
                previousGame.effect.steps !== currentGame.effect.steps ||
                previousGame.image !== currentGame.image)) {
            Effects.drawSwirl(elements['swirl-canvas'], pixelCache, strength);
        }
    }

    /**
     * Updates image navigation, automatic reveal, and game controls.
     * @param {SessionState} session
     * @returns {void}
     */
    function renderActions(session) {
        const game = session.game;
        const loading = session.upload === Session.UploadState.LOADING;
        const state = GameEngine.gameState(game);
        const noImage = state === GameEngine.GameState.NO_IMAGE;
        const completed = state === GameEngine.GameState.COMPLETED;

        elements['image-navigation'].hidden = noImage || session.selection.images.length <= 1;
        elements['previous-button'].disabled = loading || noImage || session.selection.images.length <= 1;
        elements['next-button'].disabled = loading || noImage || session.selection.images.length <= 1;
        elements['image-position'].textContent = I18n.translate(session.language, 'image.position',
            {index: session.selection.index + 1, total: session.selection.images.length});

        elements['play-button'].textContent = I18n.translate(session.language,
            GameEngine.isAutoRunning(game) ? 'button.pause' : 'button.start');
        elements['play-button'].hidden = !GameEngine.isAutomatic(game);
        elements['play-button'].disabled = loading || noImage || completed;
        elements['reveal-button'].disabled = loading || noImage || completed;
        elements['reset-button'].disabled = loading || noImage;
    }

    /**
     * Translates the current message on every render;
     * restarts visibility only when its key or error status changes.
     * Loading messages remain visible until replaced.
     * @param {SessionState} currentSession - Session after the update.
     * @param {SessionState} previousSession - Session before the update, used to detect message changes.
     * @returns {void}
     */
    function renderNotification(currentSession, previousSession) {
        const notification = currentSession.notification ?? currentSession.game.notification;
        const previousNotification = previousSession.notification ?? previousSession.game.notification;

        elements['message'].textContent = notification
            ? I18n.translate(currentSession.language, notification.key)
            : '';

        if (notification?.key === previousNotification?.key &&
            notification?.error === previousNotification?.error) {
            return;
        }

        if (notificationTimer !== null) {
            window.clearTimeout(notificationTimer);
            notificationTimer = null;
        }

        elements['notification'].classList.toggle('error', notification?.error === true);
        elements['notification'].classList.toggle('visible', notification !== null);

        if (notification !== null && currentSession.upload !== Session.UploadState.LOADING) {
            notificationTimer = window.setTimeout(() => {
                elements['notification'].classList.remove('visible');
                notificationTimer = null;
            }, notification.error ? ERROR_NOTIFICATION_DURATION_MS : NOTIFICATION_DURATION_MS);
        }
    }

    /**
     * Releases newly created URLs, logs the failure, and leaves the committed images intact.
     * @param {string[]} urls - Object URLs created for the selection.
     * @param {unknown} error - Reason loading failed.
     * @param {string} message - Error translation key.
     * @returns {void}
     */
    function abortUpload(urls, error, message) {
        urls.forEach((url) => URL.revokeObjectURL(url));
        console.error('Image selection could not be loaded.', error);
        updateSession((currentSession) => Session.failImageLoading(currentSession, message));
    }

    /**
     * @param {string} url - Image object URL.
     * @param {boolean} [includePixels=true] - Whether to read pixels for image effects.
     * @returns {Promise<{imageData: GameImage, pixels: ImageData | null}>} Image metadata and optional scaled pixels.
     * Rejects if decoding, validation, or pixel reading fails. The caller retains the URL.
     */
    async function prepareImage(url, includePixels = true) {
        const image = new Image();
        image.src = url;
        try {
            await image.decode();
            const imageData = {url, width: image.naturalWidth, height: image.naturalHeight};
            if (!GameEngine.isValidImage(imageData)) {
                throw new Error('Invalid image dimensions.');
            }
            return {imageData, pixels: includePixels ? Effects.readPixels(image) : null};
        } finally {
            image.removeAttribute('src');
        }
    }

    /**
     * Loads selected files in order, reading pixels only for the first image.
     * Keeps the current images on failure and releases their URLs after a successful import.
     * @param {File[]} files - Selected files.
     * @returns {Promise<void>} Resolves after loading or reporting an error;
     * returns immediately if already loading.
     */
    async function loadFiles(files) {
        if (session.upload === Session.UploadState.LOADING) {
            return;
        }
        updateSession((currentSession) => Session.beginUpload(currentSession, files));
        if (session.upload !== Session.UploadState.LOADING) {
            return;
        }

        const urls = [];
        const images = [];
        let firstPixels = null;
        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
                abortUpload(urls, new Error('The selected file is not an image.'), 'error.uploadType');
                return;
            }
            try {
                const url = URL.createObjectURL(file);
                urls.push(url);
                const prepared = await prepareImage(url, index === 0);
                images.push(prepared.imageData);
                if (index === 0) {
                    firstPixels = prepared.pixels;
                }
            } catch (error) {
                abortUpload(urls, error, 'error.uploadDecode');
                return;
            }
        }

        const previousImages = session.selection.images;
        const nextSession = Session.finishUpload(session, images);
        if (nextSession.selection.images === previousImages) {
            abortUpload(urls, new Error('Invalid image selection.'), 'error.uploadDecode');
            return;
        }

        pixelCache = firstPixels;
        updateSession(() => nextSession);
        for (const image of previousImages) {
            URL.revokeObjectURL(image.url);
        }
    }

    /**
     * Prepares an existing image and resets the game without releasing image URLs.
     * @param {number} index - Index of the image to activate.
     * @returns {Promise<void>} Resolves after activation or reporting an error;
     * returns immediately if unavailable.
     */
    async function changeImage(index) {
        const previousSession = session;
        updateSession((currentSession) => Session.beginImageChange(currentSession, index));
        if (session === previousSession ||
            session.upload !== Session.UploadState.LOADING) {
            return;
        }
        let prepared;
        try {
            prepared = await prepareImage(session.selection.images[index].url);
        } catch (error) {
            console.error('Image could not be activated.', error);
            updateSession((currentSession) => Session.failImageLoading(currentSession, 'error.imageChange'));
            return;
        }
        pixelCache = prepared.pixels;
        updateSession((currentSession) => Session.finishImageChange(currentSession, index));
    }

    /**
     * @param {-1 | 1} direction - Previous (-1) or next (1).
     * @returns {Promise<void>} Resolves after switching images;
     * returns immediately if switching is unavailable.
     */
    async function navigateImage(direction) {
        if (session.upload === Session.UploadState.LOADING || session.selection.images.length <= 1) {
            return;
        }
        await changeImage(Session.adjacentImageIndex(session, direction));
    }

    elements['theme'].addEventListener('change', (event) => {
        updateSession((currentSession) =>
            Session.changeTheme(currentSession, event.target.value));
    });
    elements['language'].addEventListener('change', (event) => {
        updateSession((currentSession) =>
            Session.changeLanguage(currentSession, event.target.value));
    });

    window.addEventListener('dragover', (event) => event.preventDefault());
    window.addEventListener('drop', (event) => event.preventDefault());
    elements['drop-zone'].addEventListener('dragover', (event) => {
        event.dataTransfer.dropEffect = 'copy';
        elements['drop-zone'].classList.add('dragging');
    });
    elements['drop-zone'].addEventListener('dragleave', () => {
        elements['drop-zone'].classList.remove('dragging');
    });
    elements['drop-zone'].addEventListener('drop', async (event) => {
        elements['drop-zone'].classList.remove('dragging');
        await loadFiles(Array.from(event.dataTransfer.files));
    });
    elements['file-input'].addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        event.target.value = '';
        await loadFiles(files);
    });

    modeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            updateGame((currentGame) => GameEngine.changeMode(currentGame, input.value));
        });
    });

    elements['rows'].addEventListener('change', (event) => {
        updateGame((currentGame) => GameEngine.changeGrid(
            currentGame, Number(event.target.value), currentGame.grid.columns));
    });
    elements['columns'].addEventListener('change', (event) => {
        updateGame((currentGame) => GameEngine.changeGrid(
            currentGame, currentGame.grid.rows, Number(event.target.value)));
    });

    gridModeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            updateGame((currentGame) => GameEngine.changeGridMode(currentGame, input.value));
        });
    });

    elements['effect'].addEventListener('change', (event) => {
        updateGame((currentGame) =>
            GameEngine.changeEffect(currentGame, event.target.value));
    });
    elements['effect-steps'].addEventListener('input', (event) => {
        updateGame((currentGame) =>
            GameEngine.changeEffectSteps(currentGame, Number(event.target.value)));
    });

    elements['interval'].addEventListener('input', (event) => {
        updateGame((currentGame) =>
            GameEngine.changeInterval(currentGame, Number(event.target.value)));
    });

    elements['tiles'].addEventListener('click', (event) => {
        const button = event.target.closest('button[data-row]');
        if (button && !button.disabled) {
            updateGame((currentGame) => GameEngine.revealManually(
                currentGame, Number(button.dataset.row), Number(button.dataset.column)));
        }
    });

    elements['previous-button'].addEventListener('click', async () => {
        await navigateImage(-1);
    });
    elements['next-button'].addEventListener('click', async () => {
        await navigateImage(1);
    });

    elements['play-button'].addEventListener('click', () => updateGame(GameEngine.togglePause));
    elements['reveal-button'].addEventListener('click', () => updateGame(GameEngine.revealAll));
    elements['reset-button'].addEventListener('click', () => updateGame(GameEngine.resetGame));

    initializeVersion();
    initializeControls();
    renderLanguage(session.language);
    buildBoard(session.game);
    render(session, session);
})();
