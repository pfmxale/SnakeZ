# SnakeZ.io - Multiplayer Snake Game

Ein vollständiges Slither.io-ähnliches Spiel mit Multiplayer-Funktionalität.

## Features

- **Hauptmenü** mit Namenseingabe und Charakterauswahl
- **6 verschiedene Schlangenfarben** zur Auswahl
- **Multiplayer-Gameplay** mit Echtzeit-Synchronisation
- **Responsive Steuerung** über Maus und Tastatur
- **Bestenliste** mit den besten Spielern
- **Smooth Gameplay** mit 60 FPS
- **Welt mit Grenzen** und Grid-System
- **Food-System** mit verschiedenen Größen und Farben

## Installation

1. Node.js installieren (falls nicht vorhanden)
2. Dependencies installieren:
```bash
npm install
```

## Spiel starten

```bash
npm start
```

Das Spiel läuft dann auf `http://localhost:3000`

## Steuerung

- **Maus**: Bewege die Maus, um die Schlange zu steuern
- **Tastatur**: WASD oder Pfeiltasten für Bewegung
- **Ziel**: Iss das Futter, um zu wachsen und Punkte zu sammeln
- **Vermeide**: Kollisionen mit anderen Schlangen und dir selbst

## Entwicklung

Für Entwicklung mit automatischem Neustart:
```bash
npm run dev
```

## Technologie

- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express, Socket.io
- **Echtzeit-Kommunikation**: WebSockets via Socket.io