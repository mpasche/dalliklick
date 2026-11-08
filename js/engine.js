/**
 * Decoded image metadata.
 * @typedef {{url: string, width: number, height: number}} GameImage
 */

/** @typedef {"no-image" | "in-progress" | "completed"} GameStateValue */

/**
 * Round state.
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
 * @property {string} message - Translation key, or an empty string for no message.
 * @property {boolean} error
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

    /** @returns {Game} Paused round with default settings. */
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
            message: '',
            error: false,
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
     * @param {Game} game - Round containing the tile visibility grid.
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {boolean} Whether the tile is hidden; false for coordinates outside the grid.
     */
    function isHidden(game, row, column) {
        return game.hidden[row]?.[column] === true;
    }

    /**
     * @param {Game} game - Round whose selected mode and reveal progress are checked.
     * @returns {boolean} Whether the selected mode has no reveal steps left.
     */
    function isComplete(game) {
        if (game.mode === GameMode.EFFECT) {
            return game.remainingEffectSteps === 0;
        }
        return !game.hidden.some((row) => row.some((hidden) => hidden));
    }

    /**
     * @param {Game} game - Round whose image and reveal progress determine its state.
     * @returns {GameStateValue} State derived from the image and reveal progress.
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
     * @param {Game} game - Round whose mode determines automatic reveal behavior.
     * @returns {boolean} Whether the selected mode uses automatic reveal steps.
     */
    function isAutomatic(game) {
        return game.mode === GameMode.EFFECT || game.gridMode === GridMode.RANDOM;
    }

    /**
     * @param {Game} game - Round checked for a loaded, unfinished image.
     * @returns {boolean} Whether an image is loaded and not yet fully revealed.
     */
    function isInProgress(game) {
        return gameState(game) === GameState.IN_PROGRESS;
    }

    /**
     * @param {Game} game - Round supplying mode, completion, and playback status.
     * @returns {boolean} Whether automatic playback can advance the round.
     */
    function isAutoRunning(game) {
        return isAutomatic(game) && isInProgress(game) && !game.paused;
    }

    /**
     * @param {Game} game - Round supplying the selected mode and remaining effect steps.
     * @returns {number} Remaining effect steps divided by MAX_EFFECT_STEPS.
     */
    function effectStrength(game) {
        if (game.mode !== GameMode.EFFECT) {
            return 0;
        }
        return game.remainingEffectSteps / MAX_EFFECT_STEPS;
    }

    /**
     * @param {Game} game - Round whose grid is searched for hidden tiles.
     * @returns {{row: number, column: number}[]} Hidden tiles.
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
     * @param {GameImage} image - Candidate metadata to validate.
     * @returns {boolean} Whether metadata has a nonempty URL and finite, positive dimensions.
     */
    function isValidImage(image) {
        return Boolean(image && typeof image.url === 'string' && image.url &&
            Number.isFinite(image.width) && image.width > 0 &&
            Number.isFinite(image.height) && image.height > 0);
    }

    /**
     * @param {Game} game - Current round.
     * @param {GameImage} image - Image for the new round.
     * @returns {Game} Fully hidden, paused round retaining settings,
     * or the previous round with an error message for invalid metadata.
     */
    function loadImage(game, image) {
        if (!isValidImage(image)) {
            return {...game, message: 'error.fileDecode', error: true};
        }
        return {
            ...game,
            image: {...image},
            hidden: createGrid(game.rows, game.columns, true),
            remainingEffectSteps: game.effectSteps,
            paused: true,
            message: 'message.ready',
            error: false,
        };
    }

    /**
     * @param {Game} game - Current round.
     * @param {Game["mode"]} mode - Requested grid or effect mode.
     * @returns {Game} Paused round in the selected mode, preserving both reveal states.
     * Unchanged if already selected without an error; invalid modes set an error message.
     */
    function changeMode(game, mode) {
        if (!Object.values(GameMode).includes(mode)) {
            return {...game, message: 'error.mode', error: true};
        }
        if (mode === game.mode && !game.error) {
            return game;
        }
        const changed = {...game, mode, paused: true};
        return {...changed, message: isComplete(changed) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game - Current round.
     * @param {number} rows - Integer from 1 to MAX_ROWS.
     * @param {number} columns - Integer from 1 to MAX_COLUMNS.
     * @returns {Game} Reset, paused round with the new grid.
     * Unchanged for the current valid size;
     * invalid dimensions preserve the round and set an error message.
     */
    function changeGrid(game, rows, columns) {
        if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS ||
            !Number.isInteger(columns) || columns < 1 || columns > MAX_COLUMNS) {
            return {...game, message: 'error.grid', error: true};
        }
        if (rows === game.rows && columns === game.columns && !game.error) {
            return game;
        }
        return resetGame({...game, rows, columns});
    }

    /**
     * @param {Game} game - Current round.
     * @param {Game["gridMode"]} gridMode - Requested manual or random tile reveal mode.
     * @returns {Game} Paused round retaining reveal progress.
     * Unchanged for the current valid selection;
     * invalid grid modes preserve the round and set an error message.
     */
    function changeGridMode(game, gridMode) {
        if (!Object.values(GridMode).includes(gridMode)) {
            return {...game, message: 'error.gridMode', error: true};
        }
        if (gridMode === game.gridMode && !game.error) {
            return game;
        }
        return {...game, gridMode, paused: true, message: isComplete(game) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game - Current round.
     * @param {Game["effect"]} effect - Requested image distortion effect.
     * @returns {Game} Paused round with the selected effect.
     * Unchanged for the current valid selection; invalid effects set an error message.
     */
    function changeEffect(game, effect) {
        if (!Object.values(Effect).includes(effect)) {
            return {...game, message: 'error.effect', error: true};
        }
        if (effect === game.effect && !game.error) {
            return game;
        }
        return {...game, effect, paused: true, message: isComplete(game) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game - Current round.
     * @param {number} effectSteps - Integer from MIN_EFFECT_STEPS to MAX_EFFECT_STEPS.
     * @returns {Game} Round with effect progress reset and playback paused.
     * Unchanged for the current valid count; invalid counts set an error message.
     */
    function changeEffectSteps(game, effectSteps) {
        if (!Number.isInteger(effectSteps) ||
            effectSteps < MIN_EFFECT_STEPS || effectSteps > MAX_EFFECT_STEPS) {
            return {...game, message: 'error.effectSteps', error: true};
        }
        if (effectSteps === game.effectSteps && !game.error) {
            return game;
        }
        const changed = {
            ...game, effectSteps, remainingEffectSteps: effectSteps, paused: true,
        };
        return {...changed, message: isComplete(changed) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game - Current round.
     * @param {number} intervalSeconds - Integer from 1 to MAX_INTERVAL.
     * @returns {Game} Round with the new interval, preserving progress and playback.
     * Unchanged for the current valid interval; invalid intervals set an error message.
     */
    function changeInterval(game, intervalSeconds) {
        if (!Number.isInteger(intervalSeconds) ||
            intervalSeconds < 1 || intervalSeconds > MAX_INTERVAL) {
            return {...game, message: 'error.interval', error: true};
        }
        if (intervalSeconds === game.intervalSeconds && !game.error) {
            return game;
        }
        return {...game, intervalSeconds, error: false, message: isComplete(game) ? 'message.complete' : ''};
    }

    /**
     * @param {Game} game - Current round.
     * @returns {Game} Round with playback toggled; unchanged unless automatic and in progress.
     */
    function togglePause(game) {
        if (!isAutomatic(game) || !isInProgress(game)) {
            return game;
        }
        return {...game, paused: !game.paused, message: '', error: false};
    }

    /**
     * @param {Game} game - Round whose playback must stop during image loading.
     * @returns {Game} Paused round retaining progress and messages; unchanged if already paused.
     */
    function pauseGame(game) {
        return game.paused ? game : {...game, paused: true};
    }

    /**
     * @param {Game} game - Current round.
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {Game} Round with one tile revealed and its completion message updated;
     * unchanged if the tile cannot be revealed or the round is not in progress.
     */
    function revealTile(game, row, column) {
        if (!isInProgress(game) || !isHidden(game, row, column)) {
            return game;
        }
        const hidden = [...game.hidden];
        hidden[row] = [...hidden[row]];
        hidden[row][column] = false;
        const changed = {...game, hidden};
        return {...changed, message: isComplete(changed) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game - Current round.
     * @param {number} row - Row index.
     * @param {number} column - Column index.
     * @returns {Game} Round with the requested tile revealed in manual mode;
     * unchanged in automatic mode or if the tile cannot be revealed.
     */
    function revealManually(game, row, column) {
        if (isAutomatic(game)) {
            return game;
        }
        return revealTile(game, row, column);
    }

    /**
     * @param {Game} game - Current round.
     * @returns {Game} Round advanced by one effect step or random tile;
     * unchanged unless automatic playback is running on an unfinished image.
     */
    function revealNext(game) {
        if (!isAutomatic(game) || game.paused || !isInProgress(game)) {
            return game;
        }
        if (game.mode === GameMode.EFFECT) {
            const changed = {
                ...game, remainingEffectSteps: game.remainingEffectSteps - 1,
            };
            return {...changed, message: isComplete(changed) ? 'message.complete' : '', error: false};
        }
        const tiles = hiddenTiles(game);
        const tile = tiles[Math.floor(Math.random() * tiles.length)];
        return revealTile(game, tile.row, tile.column);
    }

    /**
     * @param {Game} game - Current round.
     * @returns {Game} Fully hidden, paused round retaining its image and settings.
     */
    function resetGame(game) {
        return {
            ...game,
            hidden: createGrid(game.rows, game.columns, true),
            remainingEffectSteps: game.effectSteps,
            paused: true,
            message: 'message.reset',
            error: false,
        };
    }

    /**
     * @param {Game} game - Current round.
     * @returns {Game} Round with both reveal states completed; unchanged without an image.
     * The paused flag is preserved, but completed rounds no longer run automatically.
     */
    function revealAll(game) {
        if (gameState(game) === GameState.NO_IMAGE) {
            return game;
        }
        return {
            ...game,
            hidden: createGrid(game.rows, game.columns, false),
            remainingEffectSteps: 0,
            message: 'message.complete',
            error: false,
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
