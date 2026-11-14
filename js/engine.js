/**
 * Decoded image metadata.
 * @typedef {{url: string, width: number, height: number}} GameImage
 */

/** @typedef {"no-image" | "in-progress" | "completed"} GameStateValue */

/**
 * Current game state.
 * @typedef {Object} Game
 * @property {GameImage | null} image
 * @property {number} rows
 * @property {number} columns
 * @property {boolean[][]} hidden - True for tiles that still cover the image.
 * @property {"grid" | "effect"} mode
 * @property {"manual" | "random"} gridMode
 * @property {"blur" | "distort" | "zoom" | "swirl"} effect
 * @property {number} effectSteps
 * @property {number} remainingEffectSteps
 * @property {boolean} paused
 * @property {number} intervalSeconds
 * @property {NotificationMessage | null} notification
 */
const GameEngine = (() => {
    'use strict';

    const MAX_ROWS = 20;
    const MAX_COLUMNS = 20;
    const DEFAULT_ROWS = 6;
    const DEFAULT_COLUMNS = 8;
    const MAX_INTERVAL = 10;
    const MIN_EFFECT_STEPS = 20;
    const MAX_EFFECT_STEPS = 50;
    const GameMode = Object.freeze({GRID: 'grid', EFFECT: 'effect'});
    const GridMode = Object.freeze({MANUAL: 'manual', RANDOM: 'random'});
    const Effect = Object.freeze({BLUR: 'blur', DISTORT: 'distort', ZOOM: 'zoom', SWIRL: 'swirl'});
    /** @type {{NO_IMAGE: GameStateValue, IN_PROGRESS: GameStateValue, COMPLETED: GameStateValue}} */
    const GameState = Object.freeze({NO_IMAGE: 'no-image', IN_PROGRESS: 'in-progress', COMPLETED: 'completed'});

    /**
     * @param {number} rows - Number of rows to allocate.
     * @param {number} columns - Number of columns to allocate.
     * @param {boolean} value - Initial hidden state of every tile.
     * @returns {boolean[][]} New grid.
     */
    function createGrid(rows, columns, value) {
        return Array.from({length: rows}, () => Array(columns).fill(value));
    }

    /** @returns {Game} New game with default settings. */
    function createGame() {
        return {
            image: null,
            rows: DEFAULT_ROWS,
            columns: DEFAULT_COLUMNS,
            hidden: createGrid(DEFAULT_ROWS, DEFAULT_COLUMNS, true),
            mode: GameMode.GRID,
            gridMode: GridMode.MANUAL,
            effect: Effect.BLUR,
            effectSteps: MAX_EFFECT_STEPS,
            remainingEffectSteps: MAX_EFFECT_STEPS,
            paused: true,
            intervalSeconds: 1,
            notification: null,
        };
    }

    /**
     * @param {number} row - Row index.
     * @returns {string}
     */
    function rowNumber(row) {
        return String(row + 1);
    }

    /**
     * @param {number} column - Column index.
     * @returns {string}
     */
    function columnLetter(column) {
        // 65 is the character code of "A", so column 0 = A, 1 = B, ...
        return String.fromCharCode(65 + column);
    }

    /**
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {string} Tile coordinate.
     */
    function tileLabel(row, column) {
        return `${columnLetter(column)}${rowNumber(row)}`;
    }

    /**
     * @param {Game} game
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {boolean} Whether the tile is hidden; false if the coordinates are outside the grid.
     */
    function isHidden(game, row, column) {
        return game.hidden[row]?.[column] === true;
    }

    /**
     * @param {Game} game
     * @returns {boolean} Whether the game is fully revealed in its current mode.
     */
    function isComplete(game) {
        if (game.mode === GameMode.EFFECT) {
            return game.remainingEffectSteps === 0;
        }
        return !game.hidden.some((row) => row.some((hidden) => hidden));
    }

    /**
     * @param {Game} game
     * @returns {GameStateValue} Game state based on its image and reveal progress.
     */
    function gameState(game) {
        if (game.image === null) {
            return GameState.NO_IMAGE;
        }
        if (isComplete(game)) {
            return GameState.COMPLETED;
        }
        return GameState.IN_PROGRESS;
    }

    /**
     * @param {Game} game
     * @returns {boolean} Whether its mode reveals the image automatically.
     */
    function isAutomatic(game) {
        return game.mode === GameMode.EFFECT || game.gridMode === GridMode.RANDOM;
    }

    /**
     * @param {Game} game
     * @returns {boolean} Whether an image is loaded and not fully revealed.
     */
    function isInProgress(game) {
        return gameState(game) === GameState.IN_PROGRESS;
    }

    /**
     * @param {Game} game
     * @returns {boolean} Whether automatic reveal is running.
     */
    function isAutoRunning(game) {
        return isAutomatic(game) && isInProgress(game) && !game.paused;
    }

    /**
     * @param {Game} game
     * @returns {number} Remaining effect strength from 0 to 1.
     */
    function effectStrength(game) {
        if (game.mode !== GameMode.EFFECT) {
            return 0;
        }
        return game.remainingEffectSteps / MAX_EFFECT_STEPS;
    }

    /**
     * @param {Game} game
     * @returns {{row: number, column: number}[]} Coordinates of hidden tiles.
     */
    function hiddenTiles(game) {
        const hidden = [];
        for (let row = 0; row < game.rows; row++) {
            for (let column = 0; column < game.columns; column++) {
                if (isHidden(game, row, column)) {
                    hidden.push({row, column});
                }
            }
        }
        return hidden;
    }

    /**
     * @param {GameImage} image - Image metadata to validate.
     * @returns {boolean} Whether the URL is nonempty and both dimensions are finite and positive.
     */
    function isValidImage(image) {
        return Boolean(image && typeof image.url === 'string' && image.url &&
            Number.isFinite(image.width) && image.width > 0 &&
            Number.isFinite(image.height) && image.height > 0);
    }

    /**
     * @param {Game} game
     * @param {GameImage} image - Image to load.
     * @returns {Game} Game reset for the image, or the unchanged game with an error if invalid.
     */
    function loadImage(game, image) {
        if (!isValidImage(image)) {
            return {...game, notification: Notification.error('error.fileDecode')};
        }
        return {
            ...game,
            image: {...image},
            hidden: createGrid(game.rows, game.columns, true),
            remainingEffectSteps: game.effectSteps,
            paused: true,
            notification: Notification.info('message.ready'),
        };
    }

    /**
     * @param {Game} game
     * @param {Game["mode"]} mode - Requested grid or effect mode.
     * @returns {Game} Game in the selected mode, paused; invalid modes set an error.
     */
    function changeMode(game, mode) {
        if (!Object.values(GameMode).includes(mode)) {
            return {...game, notification: Notification.error('error.mode')};
        }
        if (mode === game.mode && !game.notification?.error) {
            return game;
        }
        const changed = {...game, mode, paused: true};
        return {...changed, notification: isComplete(changed) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @param {number} rows - Integer from 1 to MAX_ROWS.
     * @param {number} columns - Integer from 1 to MAX_COLUMNS.
     * @returns {Game} Game reset with the new grid; invalid dimensions set an error.
     */
    function changeGrid(game, rows, columns) {
        if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS ||
            !Number.isInteger(columns) || columns < 1 || columns > MAX_COLUMNS) {
            return {...game, notification: Notification.error('error.grid')};
        }
        if (rows === game.rows && columns === game.columns && !game.notification?.error) {
            return game;
        }
        return resetGame({...game, rows, columns});
    }

    /**
     * @param {Game} game
     * @param {Game["gridMode"]} gridMode - Requested manual or random tile reveal mode.
     * @returns {Game} Game with the selected grid mode, paused; invalid modes set an error.
     */
    function changeGridMode(game, gridMode) {
        if (!Object.values(GridMode).includes(gridMode)) {
            return {...game, notification: Notification.error('error.gridMode')};
        }
        if (gridMode === game.gridMode && !game.notification?.error) {
            return game;
        }
        return {...game, gridMode, paused: true,
            notification: isComplete(game) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @param {Game["effect"]} effect - Requested image distortion effect.
     * @returns {Game} Game with the selected effect, paused; invalid effects set an error.
     */
    function changeEffect(game, effect) {
        if (!Object.values(Effect).includes(effect)) {
            return {...game, notification: Notification.error('error.effect')};
        }
        if (effect === game.effect && !game.notification?.error) {
            return game;
        }
        return {...game, effect, paused: true,
            notification: isComplete(game) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @param {number} effectSteps - Integer from MIN_EFFECT_STEPS to MAX_EFFECT_STEPS.
     * @returns {Game} Game with effect progress reset and automatic reveal paused;
     * invalid counts set an error.
     */
    function changeEffectSteps(game, effectSteps) {
        if (!Number.isInteger(effectSteps) ||
            effectSteps < MIN_EFFECT_STEPS || effectSteps > MAX_EFFECT_STEPS) {
            return {...game, notification: Notification.error('error.effectSteps')};
        }
        if (effectSteps === game.effectSteps && !game.notification?.error) {
            return game;
        }
        const changed = {
            ...game, effectSteps, remainingEffectSteps: effectSteps, paused: true,
        };
        return {...changed, notification: isComplete(changed) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @param {number} intervalSeconds - Integer from 1 to MAX_INTERVAL.
     * @returns {Game} Game with the new interval; invalid intervals set an error.
     */
    function changeInterval(game, intervalSeconds) {
        if (!Number.isInteger(intervalSeconds) ||
            intervalSeconds < 1 || intervalSeconds > MAX_INTERVAL) {
            return {...game, notification: Notification.error('error.interval')};
        }
        if (intervalSeconds === game.intervalSeconds && !game.notification?.error) {
            return game;
        }
        return {...game, intervalSeconds,
            notification: isComplete(game) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @returns {Game} Game with automatic reveal toggled; unchanged if it cannot run.
     */
    function togglePause(game) {
        if (!isAutomatic(game) || !isInProgress(game)) {
            return game;
        }
        return {...game, paused: !game.paused, notification: null};
    }

    /**
     * @param {Game} game
     * @returns {Game} Paused game; unchanged if already paused.
     */
    function pauseGame(game) {
        return game.paused ? game : {...game, paused: true};
    }

    /**
     * @param {Game} game
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {Game} Game with the tile revealed; unchanged if it cannot be revealed.
     */
    function revealTile(game, row, column) {
        if (!isInProgress(game) || !isHidden(game, row, column)) {
            return game;
        }
        const hidden = [...game.hidden];
        hidden[row] = [...hidden[row]];
        hidden[row][column] = false;
        const changed = {...game, hidden};
        return {...changed, notification: isComplete(changed) ? Notification.info('message.complete') : null};
    }

    /**
     * @param {Game} game
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {Game} Game with the tile revealed; unchanged in automatic mode or if unavailable.
     */
    function revealManually(game, row, column) {
        if (isAutomatic(game)) {
            return game;
        }
        return revealTile(game, row, column);
    }

    /**
     * @param {Game} game
     * @returns {Game} Game advanced by one automatic reveal step; unchanged if it cannot advance.
     */
    function revealNext(game) {
        if (!isAutomatic(game) || game.paused || !isInProgress(game)) {
            return game;
        }
        if (game.mode === GameMode.EFFECT) {
            const changed = {
                ...game, remainingEffectSteps: game.remainingEffectSteps - 1,
            };
            return {...changed, notification: isComplete(changed) ? Notification.info('message.complete') : null};
        }
        const tiles = hiddenTiles(game);
        const tile = tiles[Math.floor(Math.random() * tiles.length)];
        return revealTile(game, tile.row, tile.column);
    }

    /**
     * @param {Game} game
     * @returns {Game} Game reset to a hidden image and paused.
     */
    function resetGame(game) {
        return {
            ...game,
            hidden: createGrid(game.rows, game.columns, true),
            remainingEffectSteps: game.effectSteps,
            paused: true,
            notification: Notification.info('message.reset'),
        };
    }

    /**
     * @param {Game} game
     * @returns {Game} Fully revealed game; unchanged if no image is loaded.
     */
    function revealAll(game) {
        if (gameState(game) === GameState.NO_IMAGE) {
            return game;
        }
        return {
            ...game,
            hidden: createGrid(game.rows, game.columns, false),
            remainingEffectSteps: 0,
            notification: Notification.info('message.complete'),
        };
    }

    return Object.freeze({
        MAX_ROWS,
        MAX_COLUMNS,
        MAX_INTERVAL,
        MIN_EFFECT_STEPS,
        MAX_EFFECT_STEPS,
        GameMode,
        GridMode,
        Effect,
        GameState,
        createGame,
        rowNumber,
        columnLetter,
        tileLabel,
        isHidden,
        gameState,
        isAutomatic,
        isAutoRunning,
        effectStrength,
        isValidImage,
        loadImage,
        changeMode,
        changeGrid,
        changeGridMode,
        changeEffect,
        changeEffectSteps,
        changeInterval,
        togglePause,
        pauseGame,
        revealManually,
        revealNext,
        resetGame,
        revealAll,
    });
})();
