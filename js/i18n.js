/** @typedef {"de" | "en"} Language */

const I18n = (() => {
    'use strict';

    const Language = Object.freeze({DE: 'de', EN: 'en'});

    const translations = {
        de: {
            'theme.light': 'Hell',
            'theme.dark': 'Dunkel',
            'image.heading': 'Bilder',
            'image-upload.select': 'Bilder auswählen',
            'image-upload.drop': 'oder hier hineinziehen',
            'image-upload.privacy': 'Deine Bilder bleiben auf deinem Gerät.',
            'image.position': 'Bild {index} von {total}',
            'image.alt': 'Dein hochgeladenes Bild',
            'game-mode.heading': 'Spielmodus',
            'game-mode.grid': 'Raster',
            'game-mode.effect': 'Effekt',
            'game-mode.grid-hint': 'Felder verdecken das Bild und werden nach und nach aufgedeckt.',
            'game-mode.effect-hint': 'Ein Effekt verfremdet das Bild und wird Schritt für Schritt schwächer.',
            'grid.heading': 'Raster',
            'grid.rows': 'Zeilen',
            'grid.columns': 'Spalten',
            'grid.hint': 'Ein neues Raster verdeckt das Bild wieder.',
            'grid-mode.manual': 'Manuell',
            'grid-mode.random': 'Zufällig',
            'grid-mode.manual-hint': 'Klicke ein Feld an, um es aufzudecken.',
            'grid-mode.random-hint': 'Zufällige Felder werden nacheinander aufgedeckt.',
            'effect.heading': 'Effekt',
            'effect.blur': 'Unschärfe',
            'effect.distort': 'Verzerrung',
            'effect.zoom': 'Zoom',
            'effect.swirl': 'Strudel',
            'effect.steps': 'Schritte',
            'interval.tile': 'Ein Feld alle',
            'interval.step': 'Ein Schritt alle',
            'interval.one': '{count} Sekunde',
            'interval.other': '{count} Sekunden',
            'game-controls.heading': 'Spielsteuerung',
            'progress-toggle.title': 'Fortschritt',
            'button.start': 'Starten',
            'button.pause': 'Pausieren',
            'button.reset': 'Zurücksetzen',
            'button.reveal': 'Aufdecken',
            'button.previous': 'Zurück',
            'button.next': 'Weiter',
            'message.images-preparing': 'Bilder werden vorbereitet',
            'message.image-loading': 'Bild wird geladen',
            'message.image-loaded': 'Bild geladen',
            'message.image-reset': 'Bild zurückgesetzt',
            'message.image-revealed': 'Bild aufgedeckt',
            'error.theme': 'Unbekanntes Design',
            'error.language': 'Unbekannte Sprache',
            'error.file-count': 'Mindestens ein Bild auswählen',
            'error.file-type': 'Bilddatei auswählen',
            'error.file-decode': 'Bild konnte nicht gelesen werden',
            'error.upload-type': 'Die Auswahl enthält eine Datei ohne Bildformat',
            'error.upload-decode': 'Bild konnte nicht geladen werden',
            'error.image-change': 'Bild konnte nicht geladen werden',
            'error.image-index': 'Ungültige Bildposition',
            'error.grid-size': 'Ungültige Rastergröße',
            'error.game-mode': 'Unbekannter Spielmodus',
            'error.grid-mode': 'Unbekannter Rastermodus',
            'error.effect': 'Unbekannter Effekt',
            'error.effect-steps': 'Ungültige Schrittzahl',
            'error.interval': 'Ungültiges Zeitintervall',
        },
        en: {
            'theme.light': 'Light',
            'theme.dark': 'Dark',
            'image.heading': 'Images',
            'image-upload.select': 'Choose images',
            'image-upload.drop': 'or drag and drop them here',
            'image-upload.privacy': 'Your images stay on your device.',
            'image.position': 'Image {index} of {total}',
            'image.alt': 'Your uploaded image',
            'game-mode.heading': 'Game mode',
            'game-mode.grid': 'Grid',
            'game-mode.effect': 'Effect',
            'game-mode.grid-hint': 'Tiles hide the image and are revealed one by one.',
            'game-mode.effect-hint': 'An effect distorts the image and gets weaker step by step.',
            'grid.heading': 'Grid',
            'grid.rows': 'Rows',
            'grid.columns': 'Columns',
            'grid.hint': 'Changing the grid hides the image again.',
            'grid-mode.manual': 'Manual',
            'grid-mode.random': 'Random',
            'grid-mode.manual-hint': 'Click a tile to reveal it.',
            'grid-mode.random-hint': 'Random tiles are revealed one by one.',
            'effect.heading': 'Effect',
            'effect.blur': 'Blur',
            'effect.distort': 'Distort',
            'effect.zoom': 'Zoom',
            'effect.swirl': 'Swirl',
            'effect.steps': 'Steps',
            'interval.tile': 'One tile every',
            'interval.step': 'One step every',
            'interval.one': '{count} second',
            'interval.other': '{count} seconds',
            'game-controls.heading': 'Game controls',
            'progress-toggle.title': 'Progress',
            'button.start': 'Start',
            'button.pause': 'Pause',
            'button.reset': 'Reset',
            'button.reveal': 'Reveal',
            'button.previous': 'Previous',
            'button.next': 'Next',
            'message.images-preparing': 'Preparing images',
            'message.image-loading': 'Loading image',
            'message.image-loaded': 'Image loaded',
            'message.image-reset': 'Image reset',
            'message.image-revealed': 'Image revealed',
            'error.theme': 'Unknown theme',
            'error.language': 'Unknown language',
            'error.file-count': 'Choose at least one image',
            'error.file-type': 'Choose an image file',
            'error.file-decode': 'Could not read image',
            'error.upload-type': 'Selection includes a file that is not an image',
            'error.upload-decode': 'Could not load image',
            'error.image-change': 'Could not load image',
            'error.image-index': 'Invalid image position',
            'error.grid-size': 'Invalid grid size',
            'error.game-mode': 'Unknown game mode',
            'error.grid-mode': 'Unknown grid mode',
            'error.effect': 'Unknown effect',
            'error.effect-steps': 'Invalid number of steps',
            'error.interval': 'Invalid interval',
        },
    };

    /**
     * @param {Language} language - Language whose translation table is used.
     * @param {string} key - Translation key; an empty key produces an empty string.
     * @param {Object<string, string | number>} [values] - Values for named placeholders.
     * @returns {string} Localized text with all placeholders replaced.
     * @throws {Error} If the translation or a required placeholder value is missing.
     */
    function translate(language, key, values = {}) {
        if (key === '') {
            return '';
        }
        const text = translations[language]?.[key];
        if (typeof text !== 'string') {
            throw new Error(`Missing translation: ${language}.${key}`);
        }
        return text.replace(/\{(\w+)}/g, (_, name) => {
            if (!(name in values)) {
                throw new Error(`Missing translation value: ${key}.${name}`);
            }
            return String(values[name]);
        });
    }

    return Object.freeze({Language, translations, translate});
})();
