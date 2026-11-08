(() => {
    'use strict';

    const NOTIFICATION_DURATION_MS = 5000;

    const elements = Object.fromEntries([
        'theme', 'language',
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
     * Applies a session change, then renders and synchronizes playback only if the state changed.
     * @param {(session: SessionState) => SessionState} transform - Session state transformation.
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
     * Applies a round change through the session's loading guard.
     * @param {(game: Game) => Game} transform - Round state transformation.
     * @returns {void}
     */
    function updateGame(transform) {
        updateSession((currentSession) => Session.applyGameChange(currentSession, transform));
    }

    /**
     * Starts, stops, or replaces the interval when playback eligibility or speed changes.
     * @param {Game} currentGame - Round after the update.
     * @param {Game} previousGame - Round before the update.
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
     * @param {SessionState["language"]} language - Language to apply to the document and UI labels.
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
     * Rebuilds tile elements, coordinates, image source, and sizing; clears tiles without an image.
     * @param {Game} game - Round supplying image metadata and grid dimensions.
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
        frame.style.setProperty('--rows', String(game.rows));
        frame.style.setProperty('--columns', String(game.columns));
        frame.style.setProperty('--aspect-ratio', String(game.image.width / game.image.height));

        for (let row = 0; row < game.rows; row++) {
            const label = document.createElement('span');
            label.textContent = GameEngine.rowNumber(row);
            elements['row-labels'].append(label);
        }
        for (let column = 0; column < game.columns; column++) {
            const label = document.createElement('span');
            label.textContent = GameEngine.columnLetter(column);
            elements['column-labels'].append(label);
        }
        for (let row = 0; row < game.rows; row++) {
            for (let column = 0; column < game.columns; column++) {
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
     * @param {Game} game - Round supplying the selected mode and effect.
     * @returns {boolean} Whether effect mode has the swirl effect selected.
     */
    function isSwirl(game) {
        return game.mode === GameEngine.GameMode.EFFECT &&
            game.effect === GameEngine.Effect.SWIRL;
    }

    /**
     * Updates the UI, rebuilding the board only when its image or grid dimensions change.
     * @param {SessionState} currentSession - State to display.
     * @param {SessionState} previousSession - Previously displayed state.
     * @returns {void}
     */
    function render(currentSession, previousSession) {
        const currentGame = currentSession.game;
        const previousGame = previousSession.game;
        if (previousSession.language !== currentSession.language) {
            renderLanguage(currentSession.language);
        }
        if (previousGame.image !== currentGame.image ||
            previousGame.rows !== currentGame.rows ||
            previousGame.columns !== currentGame.columns) {
            buildBoard(currentGame);
        }

        renderSettings(currentSession);
        renderGame(currentGame, previousGame, currentSession.upload === Session.UploadState.LOADING);
        renderActions(currentSession);
        renderNotification(currentSession, previousSession);
    }

    /**
     * Updates preferences and mode settings, disabling configuration while loading.
     * @param {SessionState} session - State supplying UI preferences, round settings, and loading status.
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
        elements['rows'].value = game.rows;
        elements['columns'].value = game.columns;
        elements['rows'].disabled = loading;
        elements['columns'].disabled = loading;
        gridModeInputs.forEach((input) => {
            input.checked = input.value === game.gridMode;
            input.disabled = loading;
        });
        elements['grid-mode-description'].textContent = I18n.translate(session.language,
            `gridMode.${game.gridMode}Hint`);
        elements['effect-settings'].hidden = !effectMode;
        elements['effect'].value = game.effect;
        elements['effect'].disabled = loading;
        elements['effect-steps'].disabled = loading;
        elements['effect-steps'].value = game.effectSteps;
        elements['effect-steps-text'].textContent = String(game.effectSteps);

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
     * @param {Game} currentGame - Round to display.
     * @param {Game} previousGame - Previous round used to avoid redundant swirl drawing.
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

        elements['board'].dataset.effect = effectMode && strength > 0 ? currentGame.effect : 'none';
        elements['board'].style.setProperty('--strength', String(strength));
        elements['distort-map'].setAttribute('scale', String(strength * Effects.MAX_DISTORT_SCALE));
        if (currentGame.image && isSwirl(currentGame) && strength > 0 &&
            (!isSwirl(previousGame) ||
                previousGame.remainingEffectSteps !== currentGame.remainingEffectSteps ||
                previousGame.effectSteps !== currentGame.effectSteps ||
                previousGame.image !== currentGame.image)) {
            Effects.drawSwirl(elements['swirl-canvas'], pixelCache, strength);
        }
    }

    /**
     * Updates image navigation, playback, and round action controls.
     * @param {SessionState} session - State supplying round availability, loading status, and image count.
     * @returns {void}
     */
    function renderActions(session) {
        const game = session.game;
        const loading = session.upload === Session.UploadState.LOADING;
        const state = GameEngine.gameState(game);
        const noImage = state === GameEngine.GameState.NO_IMAGE;
        const completed = state === GameEngine.GameState.COMPLETED;

        elements['image-navigation'].hidden = noImage || session.images.length <= 1;
        elements['previous-button'].disabled = loading || noImage || session.images.length <= 1;
        elements['next-button'].disabled = loading || noImage || session.images.length <= 1;
        elements['image-position'].textContent = I18n.translate(session.language, 'image.position',
            {index: session.imageIndex + 1, total: session.images.length});

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
     * @param {SessionState} currentSession - State supplying the displayed message.
     * @param {SessionState} previousSession - State used to detect message changes.
     * @returns {void}
     */
    function renderNotification(currentSession, previousSession) {
        const key = currentSession.message || currentSession.game.message;
        const previousKey = previousSession.message || previousSession.game.message;
        const error = currentSession.message ? currentSession.error : currentSession.game.error;
        const previousError = previousSession.message ? previousSession.error : previousSession.game.error;

        elements['message'].textContent = I18n.translate(currentSession.language, key);
        if (key === previousKey && error === previousError) {
            return;
        }

        if (notificationTimer !== null) {
            window.clearTimeout(notificationTimer);
            notificationTimer = null;
        }

        elements['notification'].classList.toggle('error', error);
        elements['notification'].classList.toggle('visible', key !== '');

        if (key !== '' && currentSession.upload !== Session.UploadState.LOADING) {
            notificationTimer = window.setTimeout(() => {
                elements['notification'].classList.remove('visible');
                notificationTimer = null;
            }, NOTIFICATION_DURATION_MS);
        }
    }

    /**
     * Releases newly created URLs, logs the failure, and leaves the committed images intact.
     * @param {string[]} urls - Object URLs created for the rejected selection.
     * @param {unknown} error - Reason the selection could not be loaded.
     * @param {string} message - Translation key for the error notification.
     * @returns {void}
     */
    function abortUpload(urls, error, message) {
        urls.forEach((url) => URL.revokeObjectURL(url));
        console.error('Image selection could not be loaded.', error);
        updateSession((currentSession) => Session.failImageLoading(currentSession, message));
    }

    /**
     * @param {string} url - Object URL of the image to decode.
     * @param {boolean} [includePixels=true] - Whether the image needs an effect pixel cache now.
     * @returns {Promise<{imageData: GameImage, pixels: ImageData | null}>} Decoded metadata and
     * optional scaled pixels. Rejects on decode, dimension, or requested pixel-read failure;
     * leaves ownership of the object URL with the caller.
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
     * Processes files sequentially. Only the first image needs pixels immediately;
     * On failure, frees new URLs and retains the old images/cache; on success, frees old URLs.
     * @param {File[]} files - Selected files in their playback order.
     * @returns {Promise<void>} Resolves after processing or a reported import failure;
     * returns immediately if another image operation is loading.
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

        const previousImages = session.images;
        const nextSession = Session.finishUpload(session, images);
        if (nextSession.images === previousImages) {
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
     * Prepares an existing image and resets its round without releasing image URLs.
     * @param {number} index - Index of the image to activate.
     * @returns {Promise<void>} Resolves after activation or a reported preparation failure;
     * returns immediately if loading, already selected, or the index is invalid.
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
            prepared = await prepareImage(session.images[index].url);
        } catch (error) {
            console.error('Image could not be activated.', error);
            updateSession((currentSession) => Session.failImageLoading(currentSession, 'error.imageChange'));
            return;
        }
        pixelCache = prepared.pixels;
        updateSession((currentSession) => Session.finishImageChange(currentSession, index));
    }

    /**
     * @param {-1 | 1} direction - Previous (-1) or next (1) image.
     * @returns {Promise<void>} Resolves after switching images, wrapping at either end;
     * returns immediately while loading or when fewer than two images are available.
     */
    async function navigateImage(direction) {
        if (session.upload === Session.UploadState.LOADING || session.images.length <= 1) {
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
            currentGame, Number(event.target.value), currentGame.columns));
    });
    elements['columns'].addEventListener('change', (event) => {
        updateGame((currentGame) => GameEngine.changeGrid(
            currentGame, currentGame.rows, Number(event.target.value)));
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

    initializeControls();
    renderLanguage(session.language);
    buildBoard(session.game);
    render(session, session);
})();
