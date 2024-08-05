export const styles = `
.error {
    color: red;
    padding: 10px;
    margin-bottom: 10px;
    background-color: #ffeeee;
    border-radius: 4px;
}
.error.hidden { display: none; }

/* Media Info */
.media-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}

.album-art {
    width: 120px;
    height: 120px;
    object-fit: cover;
    margin-right: 15px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.track-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-grow: 1;
}

.media-title {
    font-size: 1.3em;
    font-weight: bold;
    margin-bottom: 5px;
}

.media-artist {
    font-size: 1.1em;
    margin-bottom: 3px;
    color: #666;
}

.media-album {
    font-size: 0.9em;
    color: #888;
}

.media-source-icon {
    width: 24px;
    height: 24px;
    align-self: flex-start;
}

/* Controls Row */
.controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

/* Play/Pause Control */
.play-pause-control {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: 20px;
}

.play-pause-control ha-icon {
    font-size: 48px;
    cursor: pointer;
}

/* Volume Control */
.volume-control {
    display: flex;
    align-items: center;
    width: 75%;
    height: 36px;
    margin-right: 20px;
}

.volume-icon {
    cursor: pointer;
    margin-right: 10px;
    color: var(--secondary-text-color);
}

.volume-control input[type="range"] {
    -webkit-appearance: none;
    width: calc(100% - 34px);
    height: 4px;
    background: var(--secondary-background-color, #ddd);
    outline: none;
    opacity: 0.7;
    transition: opacity .2s, background .2s;
    border-radius: 2px;
    margin: 0;
}

.volume-control input[type="range"]:hover {
    opacity: 1;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}

.volume-control input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    cursor: pointer;
    border-radius: 50%;
}

/* Progress Control */
.progress-control {
    display: flex;
    align-items: center;
    margin: 15px 0;
    text-align: center;
}

.progress-bar-container {
    flex-grow: 1;
    margin: 0 10px;
    position: relative;
    height: 4px;
}

.progress-bar {
    width: 100%;
    height: 100%;
    background: var(--secondary-background-color, #d3d3d3);
    border-radius: 2px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background-color: var(--primary-color, #4CAF50);
    width: 0%;
    transition: width 0.1s linear;
}

.progress-control input[type="range"] {
    position: absolute;
    top: -2px;
    left: 0;
    width: 100%;
    -webkit-appearance: none;
    background: transparent;
    margin: 0;
    padding: 0;
    height: 8px;
    cursor: pointer;
    opacity: 0;
    z-index: 2;
}

#progress.seeking {
    opacity: 0.7;
}

.current-time, .duration {
    font-size: 0.8em;
    color: var(--secondary-text-color);
    min-width: 40px;
}

.bottom-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
}

/* Track Controls */
.track-controls {
    display: flex;
    align-items: center;
    margin-left: 20px;
}

.track-controls ha-icon {
    font-size: 22px;
    cursor: pointer;
    margin-right: 20px;
    opacity: 50%;
}

/* Extra Controls */
.extra-controls {
    display: flex;
    align-items: center;
    margin-right: 20px;
}

.extra-controls ha-icon {
    font-size: 22px;
    cursor: pointer;
    margin-left: 15px;
    opacity: 50%;
}

/* Loading State */
.card-content.loading {
    opacity: 0.5;
    pointer-events: none;
}

/* Queue Popup */
.queue-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 999;
}

.queue-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--card-background-color, white);
    padding: 20px;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80%;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.queue-content {
    display: flex;
    flex-direction: column;
}

.queue-content h3 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.2em;
    color: var(--primary-text-color);
}

#queue-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
}

#queue-list li {
    display: flex;
    align-items: center;
    padding: 10px 5px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    cursor: pointer;
    transition: background-color 0.3s;
}

#queue-list li:hover {
    background-color: var(--secondary-background-color, #f0f0f0);
}

#queue-list li.current-track {
    background-color: var(--primary-color-light, #e0e0e0);
    font-weight: bold;
}

.track-number {
    width: 30px;
    height: 30px;
    color: black;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    margin-right: 15px;
    flex-shrink: 0;
}



.track-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
}

.track-info strong {
    font-size: 1.1em;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.track-info span {
    font-size: 0.9em;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.playing-icon {
    margin-left: auto;
    --mdc-icon-size: 24px;
    color: var(--primary-color);
}

.queue-overlay.hidden,
.queue-popup.hidden {
    display: none;
}


.progress-control.sonos-hidden,
.bottom-controls.sonos-hidden {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    width: 0 !important;
    overflow: hidden !important;
}


/* Responsive Design */
@media (max-width: 600px) {
    .queue-popup {
        width: 80%;
        height: 100%;
        max-height: none;
        top: 0;
        left: 0;
        transform: none;
        border-radius: 0;
    }

    .queue-content {
        height: 100%;
    }

    #queue-list {
        flex-grow: 1;
        overflow-y: auto;
    }


}
`;