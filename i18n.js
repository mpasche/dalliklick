const I18n = (() => {
    'use strict';

    const Language = Object.freeze({DE: 'de', EN: 'en'});

    const translations = {
        de: {
            'theme.label': 'Design',
            'theme.light': 'Hell',
            'theme.dark': 'Dunkel',
            'language.label': 'Sprache',
            'image.heading': 'Bild',
            'image.select': 'Bild auswählen',
            'image.drop': 'oder hier hineinziehen',
            'image.privacy': 'Dein Bild bleibt auf deinem Gerät.',
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
            'button.start': 'Starten',
            'button.pause': 'Pausieren',
            'board.emptyHint': 'Wähle links ein Bild aus',
            'message.preparing': 'Bild wird vorbereitet',
            'message.ready': 'Bild ist bereit',
            'message.reset': 'Spiel zurückgesetzt',
            'message.complete': 'Bild aufgedeckt',
            'button.reset': 'Zurücksetzen',
            'button.reveal': 'Aufdecken',
            'error.theme': 'Unbekanntes Design',
            'error.language': 'Unbekannte Sprache',
            'error.fileCount': 'Bitte ziehe genau ein Bild in das Upload-Feld',
            'error.fileType': 'Bitte wähle eine Bilddatei aus',
            'error.fileDecode': 'Das Bild konnte nicht gelesen werden',
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
            'image.heading': 'Image',
            'image.select': 'Choose an image',
            'image.drop': 'or drag and drop it here',
            'image.privacy': 'Your image stays on your device.',
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
            'button.start': 'Start',
            'button.pause': 'Pause',
            'board.emptyHint': 'Choose an image on the left',
            'message.preparing': 'Preparing image',
            'message.ready': 'Image is ready',
            'message.reset': 'Game reset',
            'message.complete': 'Image revealed',
            'button.reset': 'Reset',
            'button.reveal': 'Reveal',
            'error.theme': 'Unknown theme',
            'error.language': 'Unknown language',
            'error.fileCount': 'Please drop exactly one image into the upload area',
            'error.fileType': 'Please choose an image file',
            'error.fileDecode': 'The image could not be read',
            'error.grid': 'Please choose a valid grid size',
            'error.mode': 'Unknown game mode',
            'error.gridMode': 'Unknown grid mode',
            'error.effect': 'Unknown effect',
            'error.effectSteps': 'Please choose a valid number of steps',
            'error.interval': 'Please choose a valid interval',
        },
    };

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
