(() => {
    'use strict';

    const elements = Object.fromEntries([
        'theme', 'language',
        'drop-zone', 'file-input',
        'mode-description',
        'grid-settings', 'rows', 'columns', 'grid-mode-description',
        'effect-settings', 'effect', 'effect-steps', 'effect-steps-text',
        'automatic-settings', 'interval-name', 'interval', 'interval-text', 'play-button',
        'empty-board', 'board-area', 'board-frame', 'column-labels', 'row-labels', 'board', 'image', 'swirl-canvas', 'tiles', 'distort-map',
        'message', 'reset-button', 'reveal-button',
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
    let pixelCache = null;

    /** @param {(session: SessionState) => SessionState} transform */
    function updateSession(transform) {
        const previous = session;
        session = transform(previous);
        if (session === previous) {
            return;
        }
        render(session, previous);
        syncTimer(session.game, previous.game);
        if (previous.game.image &&
            previous.game.image.url !== session.game.image?.url) {
            URL.revokeObjectURL(previous.game.image.url);
        }
    }

    /** @param {(game: Game) => Game} transform */
    function updateGame(transform) {
        updateSession((current) => Session.applyGameChange(current, transform));
    }

    function isAutoRunning(game) {
        return GameEngine.isAutomatic(game) &&
            GameEngine.gameState(game) === GameEngine.GameState.IN_PROGRESS &&
            !game.paused;
    }

    function syncTimer(currentGame, previousGame) {
        if (isAutoRunning(currentGame) === isAutoRunning(previousGame) &&
            currentGame.intervalSeconds === previousGame.intervalSeconds) {
            return;
        }
        if (timer !== null) {
            window.clearInterval(timer);
        }
        timer = null;
        if (isAutoRunning(currentGame)) {
            timer = window.setInterval(() => {
                updateGame(GameEngine.revealNext);
            }, currentGame.intervalSeconds * 1000);
        }
    }

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

    function renderLanguage(language) {
        document.documentElement.lang = language;
        document.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = I18n.translate(language, element.dataset.i18n);
        });
        elements['image'].alt = I18n.translate(language, 'image.alt');
    }

    function buildBoard(game) {
        // clear the board
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

    function isSwirl(game) {
        return game.mode === GameEngine.GameMode.EFFECT &&
            game.effect === GameEngine.Effect.SWIRL;
    }

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
    }

    /** @param {SessionState} session */
    function renderSettings(session) {
        const game = session.game;
        const loading = session.upload === Session.UploadState.LOADING;
        const automatic = GameEngine.isAutomatic(game);
        const effectMode = game.mode === GameEngine.GameMode.EFFECT;
        const state = GameEngine.gameState(game);
        const noImage = state === GameEngine.GameState.NO_IMAGE;
        const completed = state === GameEngine.GameState.COMPLETED;

        document.documentElement.dataset.theme = session.theme;
        elements['theme'].value = session.theme;
        elements['language'].value = session.language;

        elements['file-input'].disabled = loading;

        modeInputs.forEach((input) => {
            input.checked = input.value === game.mode;
            input.disabled = loading;
        });
        elements['mode-description'].textContent = I18n.translate(session.language, `mode.${game.mode}Hint`);

        elements['grid-settings'].hidden = effectMode;
        elements['rows'].value = game.rows;
        elements['columns'].value = game.columns;
        elements['rows'].disabled = loading;
        elements['columns'].disabled = loading;
        gridModeInputs.forEach((input) => {
            input.checked = input.value === game.gridMode;
            input.disabled = loading;
        });
        elements['grid-mode-description'].textContent = I18n.translate(session.language, `gridMode.${game.gridMode}Hint`);
        elements['effect-settings'].hidden = !effectMode;
        elements['effect'].value = game.effect;
        elements['effect'].disabled = loading;
        elements['effect-steps'].disabled = loading;
        elements['effect-steps'].value = game.effectSteps;
        elements['effect-steps-text'].textContent = String(game.effectSteps);

        elements['automatic-settings'].hidden = !automatic;
        elements['interval-name'].textContent = I18n.translate(session.language, effectMode ? 'interval.step' : 'interval.tile');
        elements['interval'].value = game.intervalSeconds;
        elements['interval'].disabled = loading;
        elements['interval-text'].textContent = I18n.translate(session.language,
            game.intervalSeconds === 1 ? 'interval.one' : 'interval.other',
            {count: game.intervalSeconds});
        elements['play-button'].textContent = I18n.translate(session.language, isAutoRunning(game) ? 'button.pause' : 'button.start');
        elements['play-button'].disabled = loading || noImage || completed;
    }

    /**
     * @param {Game} currentGame
     * @param {Game} previousGame
     * @param {boolean} loading
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
                previousGame.remainingEffectSteps !==
                currentGame.remainingEffectSteps ||
                previousGame.effectSteps !== currentGame.effectSteps ||
                previousGame.image !== currentGame.image)) {
            Effects.drawSwirl(elements['swirl-canvas'], pixelCache, strength);
        }
    }

    function renderActions(session) {
        const game = session.game;
        const loading = session.upload === Session.UploadState.LOADING;
        const state = GameEngine.gameState(game);
        const noImage = state === GameEngine.GameState.NO_IMAGE;
        const completed = state === GameEngine.GameState.COMPLETED;

        elements['message'].textContent = I18n.translate(session.language, session.message || game.message);
        elements['message'].classList.toggle('error', session.message ? session.error : game.error);
        elements['reset-button'].disabled = loading || noImage;
        elements['reveal-button'].disabled = loading || noImage || completed;
    }

    async function loadFiles(files) {
        if (session.upload === Session.UploadState.LOADING) {
            return;
        }
        updateSession((current) => Session.beginUpload(current, files));
        if (session.upload !== Session.UploadState.LOADING) {
            return;
        }

        const file = files[0];
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.src = url;
        let pixels;
        try {
            await image.decode();
            pixels = Effects.readPixels(image);
        } catch (error) {
            URL.revokeObjectURL(url);
            console.error('Image could not be loaded.', error);
            updateSession(Session.failUpload);
            return;
        }

        const imageData = {
            url, width: image.naturalWidth, height: image.naturalHeight,
        };
        pixelCache = pixels;
        updateSession((current) => Session.finishUpload(current, imageData));
    }

    elements['theme'].addEventListener('change', (event) => {
        updateSession((current) =>
            Session.changeTheme(current, event.target.value));
    });
    elements['language'].addEventListener('change', (event) => {
        updateSession((current) =>
            Session.changeLanguage(current, event.target.value));
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
    elements['drop-zone'].addEventListener('drop', (event) => {
        elements['drop-zone'].classList.remove('dragging');
        loadFiles(Array.from(event.dataTransfer.files));
    });
    elements['file-input'].addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        event.target.value = '';
        loadFiles(files);
    });

    modeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            updateGame((current) => GameEngine.changeMode(current, input.value));
        });
    });

    elements['rows'].addEventListener('change', (event) => {
        updateGame((current) => GameEngine.changeGrid(
            current, Number(event.target.value), current.columns));
    });
    elements['columns'].addEventListener('change', (event) => {
        updateGame((current) => GameEngine.changeGrid(
            current, current.rows, Number(event.target.value)));
    });

    gridModeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            updateGame((current) => GameEngine.changeGridMode(current, input.value));
        });
    });

    elements['effect'].addEventListener('change', (event) => {
        updateGame((current) =>
            GameEngine.changeEffect(current, event.target.value));
    });
    elements['effect-steps'].addEventListener('input', (event) => {
        updateGame((current) =>
            GameEngine.changeEffectSteps(current, Number(event.target.value)));
    });

    elements['interval'].addEventListener('input', (event) => {
        updateGame((current) =>
            GameEngine.changeInterval(current, Number(event.target.value)));
    });

    elements['play-button'].addEventListener('click', () => updateGame(GameEngine.togglePause));

    elements['tiles'].addEventListener('click', (event) => {
        const button = event.target.closest('button[data-row]');
        if (button && !button.disabled) {
            updateGame((current) => GameEngine.revealManually(
                current, Number(button.dataset.row), Number(button.dataset.column)));
        }
    });

    elements['reset-button'].addEventListener('click', () => updateGame(GameEngine.resetGame));
    elements['reveal-button'].addEventListener('click', () => updateGame(GameEngine.revealAll));


    initializeControls();
    renderLanguage(session.language);
    buildBoard(session.game);
    render(session, session);
})();
