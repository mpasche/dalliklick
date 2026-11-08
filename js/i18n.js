const I18n = (() => {
    'use strict';

    const Language = Object.freeze({DE: 'de', EN: 'en'});

    const translations = {
        de: {
            'theme.label': 'Design',
            'theme.light': 'Hell',
            'theme.dark': 'Dunkel',
            'language.label': 'Sprache',
            'image.heading': 'Bilder',
            'image.select': 'Bilder auswählen',
            'image.drop': 'oder hier hineinziehen',
            'image.privacy': 'Deine Bilder bleiben auf deinem Gerät.',
            'image.position': 'Bild {index} von {total}',
            'image.navigation': 'Bildnavigation',
            'image.alt': 'Dein hochgeladenes Bild',
            'mode.heading': 'Spielmodus',
            'mode.grid': 'Raster',
            'mode.effect': 'Effekt',
            'mode.gridHint': 'Felder verdecken das Bild und werden nach und nach aufgedeckt.',
            'mode.effectHint': 'Ein Effekt verfremdet das Bild und wird Schritt für Schritt schwächer.',
            'grid.heading': 'Raster',
            'grid.rows': 'Zeilen',
            'grid.columns': 'Spalten',
            'grid.hint': 'Ein neues Raster verdeckt das Bild wieder.',
            'gridMode.manual': 'Manuell',
            'gridMode.random': 'Zufällig',
            'gridMode.manualHint': 'Klicke ein Feld an, um es aufzudecken.',
            'gridMode.randomHint': 'Zufällige Felder werden nacheinander aufgedeckt.',
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
            'play.heading': 'Spielsteuerung',
            'button.start': 'Starten',
            'button.pause': 'Pausieren',
            'button.reset': 'Zurücksetzen',
            'button.reveal': 'Aufdecken',
            'button.previous': 'Zurück',
            'button.next': 'Weiter',
            'message.preparing': 'Bilder werden vorbereitet',
            'message.ready': 'Bild ist bereit',
            'message.reset': 'Spiel zurückgesetzt',
            'message.complete': 'Bild aufgedeckt',
            'error.theme': 'Unbekanntes Design',
            'error.language': 'Unbekannte Sprache',
            'error.fileCount': 'Bitte wähle mindestens ein Bild aus',
            'error.fileType': 'Bitte wähle eine Bilddatei aus',
            'error.fileDecode': 'Das Bild konnte nicht gelesen werden',
            'error.uploadType': 'Die Auswahl enthält eine Datei, die kein Bild ist.',
            'error.uploadDecode': 'Ein Bild konnte nicht geladen werden.',
            'error.imageChange': 'Das Bild konnte nicht geladen werden.',
            'error.imageIndex': 'Ungültige Bildposition',
            'error.grid': 'Bitte wähle eine gültige Rastergröße',
            'error.mode': 'Unbekannter Spielmodus',
            'error.gridMode': 'Unbekannter Rastermodus',
            'error.effect': 'Unbekannter Effekt',
            'error.effectSteps': 'Bitte wähle eine gültige Schrittzahl',
            'error.interval': 'Bitte wähle ein gültiges Zeitintervall',
        },
        en: {
            'theme.label': 'Theme',
            'theme.light': 'Light',
            'theme.dark': 'Dark',
            'language.label': 'Language',
            'image.heading': 'Images',
            'image.select': 'Choose images',
            'image.drop': 'or drag and drop them here',
            'image.privacy': 'Your images stay on your device.',
            'image.position': 'Image {index} of {total}',
            'image.navigation': 'Image navigation',
            'image.alt': 'Your uploaded image',
            'mode.heading': 'Game mode',
            'mode.grid': 'Grid',
            'mode.effect': 'Effect',
            'mode.gridHint': 'Tiles hide the image and are revealed one by one.',
            'mode.effectHint': 'An effect distorts the image and gets weaker step by step.',
            'grid.heading': 'Grid',
            'grid.rows': 'Rows',
            'grid.columns': 'Columns',
            'grid.hint': 'Changing the grid hides the image again.',
            'gridMode.manual': 'Manual',
            'gridMode.random': 'Random',
            'gridMode.manualHint': 'Click a tile to reveal it.',
            'gridMode.randomHint': 'Random tiles are revealed one by one.',
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
            'play.heading': 'Game controls',
            'button.start': 'Start',
            'button.pause': 'Pause',
            'button.reset': 'Reset',
            'button.reveal': 'Reveal',
            'button.previous': 'Previous',
            'button.next': 'Next',
            'message.preparing': 'Preparing images',
            'message.ready': 'Image is ready',
            'message.reset': 'Game reset',
            'message.complete': 'Image revealed',
            'error.theme': 'Unknown theme',
            'error.language': 'Unknown language',
            'error.fileCount': 'Please choose at least one image',
            'error.fileType': 'Please choose an image file',
            'error.fileDecode': 'The image could not be read',
            'error.uploadType': 'The selection contains a file that is not an image.',
            'error.uploadDecode': 'An image could not be loaded.',
            'error.imageChange': 'The image could not be loaded.',
            'error.imageIndex': 'Invalid image position',
            'error.grid': 'Please choose a valid grid size',
            'error.mode': 'Unknown game mode',
            'error.gridMode': 'Unknown grid mode',
            'error.effect': 'Unknown effect',
            'error.effectSteps': 'Please choose a valid number of steps',
            'error.interval': 'Please choose a valid interval',
        },
    };

    /**
     * @param {SessionState["language"]} language - Language whose translation table is used.
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
