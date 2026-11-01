/**
 * @typedef {{url: string, width: number, height: number}} GameImage
 */

/**
 * @typedef {Object} Game
 * @property {GameImage | null} image
 * @property {number} rows
 * @property {number} columns
 * @property {boolean[][]} hidden
 * @property {"grid" | "effect"} mode
 * @property {"manual" | "random"} gridMode
 * @property {"blur" | "distort" | "zoom" | "swirl"} effect
 * @property {number} effectSteps
 * @property {number} remainingEffectSteps
 * @property {boolean} paused
 * @property {number} intervalSeconds
 * @property {string} message
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
    const GameState = Object.freeze({NO_IMAGE: 'no-image', IN_PROGRESS: 'in-progress', COMPLETED: 'completed'});

    function createGrid(rows, columns, value) {
        return Array.from({length: rows}, () => Array(columns).fill(value));
    }

    /** @returns {Game} */
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

    function rowNumber(row) {
        return String(row + 1);
    }

    function columnLetter(column) {
        // 65 is the character code of "A", so column 0 = A, 1 = B, ...
        return String.fromCharCode(65 + column);
    }

    function tileLabel(row, column) {
        return `${columnLetter(column)}${rowNumber(row)}`;
    }

    /** @param {Game} game */
    function isAutomatic(game) {
        return game.mode === GameMode.EFFECT || game.gridMode === GridMode.RANDOM;
    }

    /**
     * @param {Game} game
     * @param {number} row
     * @param {number} column
     */
    function isHidden(game, row, column) {
        return game.hidden[row]?.[column] === true;
    }

    /** @param {Game} game */
    function isComplete(game) {
        if (game.mode === GameMode.EFFECT) {
            return game.remainingEffectSteps === 0;
        }
        return !game.hidden.some((row) => row.some((hidden) => hidden));
    }

    /** @param {Game} game */
    function gameState(game) {
        if (game.image === null) {
            return GameState.NO_IMAGE;
        }
        if (isComplete(game)) {
            return GameState.COMPLETED;
        }
        return GameState.IN_PROGRESS;
    }

    /** @param {Game} game */
    function isInProgress(game) {
        return gameState(game) === GameState.IN_PROGRESS;
    }

    /** @param {Game} game */
    function effectStrength(game) {
        if (game.mode !== GameMode.EFFECT) {
            return 0;
        }
        return game.remainingEffectSteps / MAX_EFFECT_STEPS;
    }

    /** @param {Game} game */
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
     * @param {Game} game
     * @param {GameImage} image
     */
    function loadImage(game, image) {
        if (!image || !image.url || typeof image.url !== 'string' ||
            !Number.isFinite(image.width) || image.width <= 0 ||
            !Number.isFinite(image.height) || image.height <= 0) {
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
     * @param {Game} game
     * @param {Game["mode"]} mode
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
     * @param {Game} game
     * @param {number} rows
     * @param {number} columns
     */
    function changeGrid(game, rows, columns) {
        if (!Number.isInteger(rows) || rows < 1 || rows > MAX_ROWS ||
            !Number.isInteger(columns) ||
            columns < 1 || columns > MAX_COLUMNS) {
            return {...game, message: 'error.grid', error: true};
        }
        if (rows === game.rows && columns === game.columns && !game.error) {
            return game;
        }
        return resetGame({...game, rows, columns});
    }

    /**
     * @param {Game} game
     * @param {Game["gridMode"]} gridMode
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
     * @param {Game} game
     * @param {Game["effect"]} effect
     */
    function changeEffect(game, effect) {
        if (!Object.values(Effect).includes(effect)) {
            return {...game, message: 'error.effect', error: true};
        }
        if (effect === game.effect && !game.error) {
            return game;
        }
        return {...game, effect, message: isComplete(game) ? 'message.complete' : '', error: false};
    }

    /**
     * @param {Game} game
     * @param {number} effectSteps
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
     * @param {Game} game
     * @param {number} intervalSeconds
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

    /** @param {Game} game */
    function togglePause(game) {
        if (!isAutomatic(game) || !isInProgress(game)) {
            return game;
        }
        return {...game, paused: !game.paused, message: '', error: false};
    }

    /**
     * @param {Game} game
     * @param {number} row
     * @param {number} column
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
     * @param {Game} game
     * @param {number} row
     * @param {number} column
     */
    function revealManually(game, row, column) {
        if (isAutomatic(game)) {
            return game;
        }
        return revealTile(game, row, column);
    }

    /** @param {Game} game */
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

    /** @param {Game} game */
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

    /** @param {Game} game */
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
        isAutomatic,
        isHidden,
        gameState,
        effectStrength,
        loadImage,
        changeMode,
        changeGrid,
        changeGridMode,
        changeEffect,
        changeEffectSteps,
        changeInterval,
        togglePause,
        revealManually,
        revealNext,
        resetGame,
        revealAll,
    });
})();
