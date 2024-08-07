import { styles } from './modules/styles.js';

class SonosCustomPlayerCard extends HTMLElement {
    _config;
    _hass;
    _elements = {};
    progressInterval = null;
    _previousVolume = null;

    constructor() {
        super();
        this._elements = {};
        this.doCard();
        this.doStyle();
        this.doAttach();
    }

    setConfig(config) {
        this._config = config;
        this.doCheckConfig();
        this.doUpdateConfig();
        this.doQueryElements();
    }

    set hass(hass) {
        this._hass = hass;
        this.doUpdateHass();
    }

    getEntityID() {
        const inputTextState = this._hass.states[this._config.entity];
        const entityID = inputTextState ? inputTextState.state : null;
        return entityID;
    }

    getState() {
        const entityID = this.getEntityID();
        const state = entityID ? this._hass.states[entityID] : null;
        return state;
    }

    getAttributes() {
        const state = this.getState();
        return state ? state.attributes : {};
    }

    getName() {
        const attributes = this.getAttributes();
        return attributes.friendly_name ? attributes.friendly_name : this.getEntityID();
    }

    determineContentType(mediaContentId, attributes) {
        if (!mediaContentId) return 'unknown';
        
        if (typeof mediaContentId === 'string') {
            if (mediaContentId.includes("x-rincon-mp3radio") || mediaContentId.includes("hls-radio") || mediaContentId.includes("aac://")) {
                return 'radio';
            }
            if (mediaContentId.includes("x-sonos-spotify")) {
                return 'spotify';
            }
            if (mediaContentId.includes("x-sonos-http")) {
                return 'plex';
            }
        }
        
        return 'other';
    }

    updateMediaInfo(attributes) {
        const contentType = this.determineContentType(attributes.media_content_id, attributes);
        
        this.updateMediaIcon(contentType);
        this.updateMediaImage(contentType, attributes);
        this.updateMediaText(contentType, attributes);
    }

    updateMediaIcon(contentType) {
        if (this._elements.mediaSourceIcon) {
            switch (contentType) {
                case 'radio':
                    this._elements.mediaSourceIcon.setAttribute("icon", "mdi:radio");
                    this.hideProgressBar();
                    break;
                case 'spotify':
                    this._elements.mediaSourceIcon.setAttribute("icon", "mdi:spotify");
                    this.showProgressBar();
                    break;
                case 'plex':
                    this._elements.mediaSourceIcon.setAttribute("icon", "mdi:plex");
                    this.showProgressBar();
                    break;
                default:
                    this._elements.mediaSourceIcon.removeAttribute("icon");
                    this.showProgressBar();
            }
        }
    }

    updateMediaImage(contentType, attributes) {
        if (this._elements.albumArt) {
            if (contentType === 'radio') {
                const sensorName = `${this.getEntityID().split('.')[1]}_info`;
                const sensorEntityId = `sensor.${sensorName}`;
                const sensorState = this._hass.states[sensorEntityId];
                this._elements.albumArt.src = sensorState?.attributes?.radio_thumbnail || attributes.entity_picture || '';
            } else {
                this._elements.albumArt.src = attributes.entity_picture || '';
            }
        }
    }

    updateMediaText(contentType, attributes) {
        if (this._elements.mediaTitle) {
            if (contentType === 'radio') {
                const sensorName = `${this.getEntityID().split('.')[1]}_info`;
                const sensorEntityId = `sensor.${sensorName}`;
                const sensorState = this._hass.states[sensorEntityId];
                this._elements.mediaTitle.textContent = sensorState?.attributes?.radio_name || attributes.media_title || 'Sconosciuto';
            } else {
                this._elements.mediaTitle.textContent = attributes.media_title || 'Sconosciuto';
            }
        }

        if (contentType === 'radio') {
            if (this._elements.mediaArtist) this._elements.mediaArtist.style.display = 'none';
            if (this._elements.mediaAlbum) this._elements.mediaAlbum.style.display = 'none';
        } else {
            if (this._elements.mediaArtist) {
                this._elements.mediaArtist.textContent = attributes.media_artist || 'Sconosciuto';
                this._elements.mediaArtist.style.display = '';
            }
            if (this._elements.mediaAlbum) {
                this._elements.mediaAlbum.textContent = attributes.media_album_name || 'Sconosciuto';
                this._elements.mediaAlbum.style.display = '';
            }
        }
    }

    onClicked() {
        this.doToggle();
    }

    onVolumeChanged(event) {
        const volume = event.target.value;
        this._hass.callService("media_player", "volume_set", {
            entity_id: this.getEntityID(),
            volume_level: volume / 100
        });
    }

    syncPositionWithServer() {
        this._hass.callService("media_player", "media_seek", {
            entity_id: this.getEntityID(),
            seek_position: this.lastKnownPosition
        }).then(() => {
            this._hass.callService("homeassistant", "update_entity", {
                entity_id: this.getEntityID()
            }).then(() => {
                const state = this.getState();
                if (state && state.attributes.media_position !== undefined) {
                    this.lastKnownPosition = state.attributes.media_position;
                    this.updateProgress();
                }
            });
        }).catch(error => {
            console.error("Failed to sync position with server:", error);
        });
    }

    onPlayPause() {
        const state = this.getState();
        const isPlaying = state.state === "playing";
        const service = isPlaying ? "media_pause" : "media_play";
        
        if (isPlaying) {
            this.stopProgressUpdate();
            this.updateProgress();
        }
        
        this._hass.callService("media_player", service, {
            entity_id: this.getEntityID()
        }).then(() => {
            if (isPlaying) {
                this.syncPositionWithServer();
            }
            setTimeout(() => {
                this._hass.callService("homeassistant", "update_entity", {
                    entity_id: this.getEntityID()
                }).then(() => {
                    const newState = this.getState();
                    if (newState && newState.state === "playing") {
                        this.lastKnownPosition = newState.attributes.media_position || this.lastKnownPosition;
                        this.playbackStartTime = performance.now();
                        this.startProgressUpdate();
                    }
                    this.doUpdateHass();
                });
            }, 500);
        });
    }

    onProgressChanged(event) {
        const progress = parseFloat(event.target.value) / 100;
    
        this.updateSeekBarProgress(progress);
    
        const state = this.getState();
    
        if (state && state.attributes.media_duration) {
            const mediaDuration = parseFloat(state.attributes.media_duration);
    
            if (isNaN(mediaDuration) || !isFinite(mediaDuration)) {
                console.error("Invalid media duration");
                return;
            }
    
            const seekPosition = progress * mediaDuration;
    
            const roundedSeekPosition = Math.round(seekPosition * 100) / 100;
    
            clearTimeout(this.seekTimeout);
            this.seekTimeout = setTimeout(() => {
                this._elements.progressSlider.classList.add('seeking');
                this._elements.currentTime.textContent = this.formatTime(roundedSeekPosition);
    
                this._hass.callService("media_player", "media_seek", {
                    entity_id: this.getEntityID(),
                    seek_position: roundedSeekPosition
                }).then(() => {
                    this.lastKnownPosition = roundedSeekPosition;
                    this.playbackStartTime = performance.now();
                    this._elements.progressSlider.classList.remove('seeking');
                    this.updateProgress();
                }).catch((error) => {
                    console.error("Seek failed:", error);
                    this._elements.progressSlider.classList.remove('seeking');
                    this._elements.error.textContent = "Impossibile impostare la nuova posizione.";
                    this._elements.error.classList.remove("hidden");
                    setTimeout(() => {
                        this._elements.error.classList.add("hidden");
                    }, 3000);
                }).finally(() => {
                    this.updateStateAfterDelay();
                });
            }, 250);
        } else {
            console.error("State or media duration not available");
        }
    }

    updateStateAfterDelay(delay = 2000) {
        setTimeout(() => {
            this._hass.callService("homeassistant", "update_entity", {
                entity_id: this.getEntityID()
            }).then(() => {
                this.doUpdateHass();
            });
        }, delay);
    }

    onNextTrack() {
        this._hass.callService("media_player", "media_next_track", {
            entity_id: this.getEntityID()
        });
    }

    onPrevTrack() {
        this._hass.callService("media_player", "media_previous_track", {
            entity_id: this.getEntityID()
        });
    }

    onShuffleChanged() {
        const currentShuffle = this.getAttributes().shuffle;
        const newShuffle = !currentShuffle;
        this._hass.callService("media_player", "shuffle_set", {
            entity_id: this.getEntityID(),
            shuffle: newShuffle
        });
    }

    onRepeatChanged() {
        const currentRepeat = this.getAttributes().repeat;
        let newRepeat;
        if (currentRepeat === 'off') {
            newRepeat = 'all';
        } else if (currentRepeat === 'all') {
            newRepeat = 'one';
        } else {
            newRepeat = 'off';
        }
        this._hass.callService("media_player", "repeat_set", {
            entity_id: this.getEntityID(),
            repeat: newRepeat
        });
    }

    onVolumeIconClicked() {
        const state = this.getState();
        const isMuted = state.attributes.is_volume_muted;
        const currentVolume = state.attributes.volume_level;
    
        if (isMuted) {
            const volumeToSet = this._previousVolume !== null ? this._previousVolume : 0.5;
            this._hass.callService("media_player", "volume_set", {
                entity_id: this.getEntityID(),
                volume_level: volumeToSet
            });
            this._hass.callService("media_player", "volume_mute", {
                entity_id: this.getEntityID(),
                is_volume_muted: false
            });
            this._previousVolume = null;
        } else {
            this._previousVolume = currentVolume;
            this._hass.callService("media_player", "volume_mute", {
                entity_id: this.getEntityID(),
                is_volume_muted: true
            });
        }
    }

    onQueueClicked() {
        const entityId = this.getEntityID();
        this._hass.callService("sonos_helper", "get_queue", {
            entity_id: entityId
        }).then(() => {
            setTimeout(() => {
                this.updateQueuePopup();
                this.toggleQueuePopup(true);
            }, 500);
        }).catch(error => {
            console.error("Error fetching queue:", error);
            this._elements.error.textContent = "Impossibile recuperare la coda di riproduzione.";
            this._elements.error.classList.remove("hidden");
            setTimeout(() => {
                this._elements.error.classList.add("hidden");
            }, 3000);
        });
    }

    updateQueuePopup() {
        const entityId = this.getEntityID();
        const playerState = this.getState();
        const sensorName = `${entityId.split('.')[1]}_info`;
        const queueState = this._hass.states[`sensor.${sensorName}`];
        const currentTrackNumber = playerState.attributes.queue_position;
        const friendlyName = this.getFriendlyName();

        if (queueState && queueState.attributes && queueState.attributes.queue_items) {
            this._elements.queueList.innerHTML = '';
            
            const popupTitle = this._elements.queuePopup.querySelector('h3');
            if (popupTitle) {
                popupTitle.textContent = `Coda del player ${friendlyName}`;
            } else {
                const title = document.createElement('h3');
                title.textContent = `Coda del ${friendlyName}`;
                this._elements.queuePopup.insertBefore(title, this._elements.queueList);
            }

            queueState.attributes.queue_items.forEach((item, index) => {
                const li = document.createElement('li');
                const isCurrentTrack = index === currentTrackNumber - 1;
                li.classList.toggle('current-track', isCurrentTrack);
                
                li.innerHTML = `
                    <div class="track-number">${index + 1}</div>
                    <div class="track-info">
                        <strong>${item.title}</strong>
                        <span>${item.artist} - ${item.album}</span>
                        <span>Durata: ${this.formatTime(item.duration)}</span>
                    </div>
                    ${isCurrentTrack ? '<ha-icon class="playing-icon" icon="mdi:play-circle-outline"></ha-icon>' : ''}
                `;
                li.addEventListener('click', () => this.playQueueItem(index));
                this._elements.queueList.appendChild(li);
            });
        } else {
            console.error("Queue information not available");
            this._elements.queueList.innerHTML = '<li>Informazioni sulla coda non disponibili</li>';
        }
    }

    onCloseQueue() {
        this._elements.queuePopup.classList.add("hidden");
    }
    
    getFriendlyName() {
        const state = this.getState();
        return state ? state.attributes.friendly_name || this.getEntityID() : 'Player';
    }

    async playQueueItem(index) {
        const entityId = this.getEntityID();
        try {
            const state = this.getState();
            const currentQueuePosition = state.attributes.queue_position || 0;
    
            const positionDifference = index + 1 - currentQueuePosition;
    
            if (positionDifference > 0) {
                for (let i = 0; i < positionDifference; i++) {
                    await this._hass.callService("media_player", "media_next_track", {
                        entity_id: entityId
                    });
                }
            } else if (positionDifference < 0) {
                for (let i = 0; i > positionDifference; i--) {
                    await this._hass.callService("media_player", "media_previous_track", {
                        entity_id: entityId
                    });
                }
            }
    
            await this._hass.callService("media_player", "media_play", {
                entity_id: entityId
            });
    
            this.toggleQueuePopup(false);
    
            setTimeout(() => {
                this._hass.callService("homeassistant", "update_entity", {
                    entity_id: entityId
                });
            }, 500);
    
        } catch (error) {
            console.error("Error playing queue item:", error);
            this._elements.error.textContent = "Impossibile riprodurre il brano selezionato.";
            this._elements.error.classList.remove("hidden");
            setTimeout(() => {
                this._elements.error.classList.add("hidden");
            }, 3000);
        }
    }

    
    forceUpdate() {
        this._hass.callService("homeassistant", "update_entity", {
            entity_id: this.getEntityID()
        }).then(() => {
            this.doUpdateHass();
        }).catch(error => {
            console.error("Error forcing update:", error);
        });
    }

    isOff() {
        const state = this.getState();
        return state ? state.state === "off" : true;
    }

    isOn() {
        const state = this.getState();
        return state ? state.state === "on" : false;
    }

    getHeader() {
        return this._config.header;
    }

    doCheckConfig() {
        if (!this._config.entity) {
            throw new Error("Please define an entity!");
        }
    }

    doCard() {
        this._elements.card = document.createElement("ha-card");
        this._elements.card.innerHTML = `
            <div class="card-content">
                <p class="error error hidden"></p>
                <div class="media-info">
                    <img class="album-art" src="" alt="Album Art">
                    <div class="track-info">
                        <div class="media-title"></div>
                        <div class="media-artist"></div>
                        <div class="media-album"></div>                        
                    </div>
                    <ha-icon class="media-source-icon"></ha-icon>
                </div>
                <div class="controls-row">
                    <div class="play-pause-control">
                        <ha-icon id="play-pause" icon="mdi:play-outline"></ha-icon>
                    </div>
                    <div class="volume-control">
                        <ha-icon id="volume-icon" class="volume-icon" icon="mdi:volume-high"></ha-icon>
                        <input type="range" id="volume" name="volume" min="0" max="100">
                    </div>
                </div>
                <div class="progress-control">
                    <span class="current-time">0:00</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-bar-fill"></div>
                        </div>
                        <input type="range" id="progress" name="progress" min="0" max="100" value="0">
                    </div>
                    <span class="duration">0:00</span>
                </div>
                <div class="bottom-controls">
                    <div class="track-controls">
                        <ha-icon id="prev-track" icon="mdi:skip-previous-outline"></ha-icon>
                        <ha-icon id="next-track" icon="mdi:skip-next-outline"></ha-icon>
                    </div>
                    <div class="extra-controls">
                        <ha-icon id="repeat" icon="mdi:repeat-off"></ha-icon>
                        <ha-icon id="shuffle" icon="mdi:shuffle-disabled"></ha-icon>
                        <ha-icon id="queue" icon="mdi:playlist-music"></ha-icon>
                    </div>
                </div>
            </div>
            <div id="queue-overlay" class="queue-overlay hidden"></div>
            <div id="queue-popup" class="queue-popup hidden">
                <div class="queue-content">
                    <h3></h3>
                    <ul id="queue-list"></ul>
                </div>            
            </div>           
        `;
    }

    doStyle() {
        this._elements.style = document.createElement("style");
        this._elements.style.textContent = styles;
    }

    doAttach() {
        this.attachShadow({ mode: "open" });
        this.shadowRoot.append(this._elements.style, this._elements.card);
    }

    doQueryElements() {
        if (!this.shadowRoot) {
            console.warn("Shadow root not available, deferring element query");
            return;
        }
    
        const card = this.shadowRoot.querySelector("ha-card");
        if (!card) {
            console.warn("Card element not found, deferring element query");
            return;
        }
    
        this._elements = {
            card: card,
            error: card.querySelector(".error"),
            albumArt: card.querySelector(".album-art"),
            mediaTitle: card.querySelector(".media-title"),
            mediaArtist: card.querySelector(".media-artist"),
            mediaAlbum: card.querySelector(".media-album"),
            mediaSourceIcon: card.querySelector(".media-source-icon"),
            volumeIcon: card.querySelector("#volume-icon"),
            volumeSlider: card.querySelector("#volume"),
            playPause: card.querySelector("#play-pause"),
            nextTrack: card.querySelector("#next-track"),
            prevTrack: card.querySelector("#prev-track"),
            shuffle: card.querySelector("#shuffle"),
            repeat: card.querySelector("#repeat"),
            progressSlider: card.querySelector("#progress"),
            currentTime: card.querySelector(".current-time"),
            duration: card.querySelector(".duration"),
            progressBar: card.querySelector(".progress-bar-fill"),
            queueButton: card.querySelector("#queue"),
            queueOverlay: this.shadowRoot.querySelector("#queue-overlay"),
            queuePopup: this.shadowRoot.querySelector("#queue-popup"),
            queueList: this.shadowRoot.querySelector("#queue-list")
        };
    
        // Log degli elementi non trovati
        for (const [key, element] of Object.entries(this._elements)) {
            if (!element) {
                console.warn(`Element ${key} not found`);
            }
        }
    }

    doListen() {
        // Creiamo versioni bound dei nostri metodi di gestione eventi
        this.boundOnVolumeIconClicked = this.onVolumeIconClicked.bind(this);
        this.boundOnVolumeChanged = this.onVolumeChanged.bind(this);
        this.boundOnPlayPause = this.onPlayPause.bind(this);
        this.boundOnNextTrack = this.onNextTrack.bind(this);
        this.boundOnPrevTrack = this.onPrevTrack.bind(this);
        this.boundOnShuffleChanged = this.onShuffleChanged.bind(this);
        this.boundOnRepeatChanged = this.onRepeatChanged.bind(this);
        this.boundOnProgressChanged = this.onProgressChanged.bind(this);
        this.boundOnQueueClicked = this.onQueueClicked.bind(this);
        this.boundToggleQueuePopup = () => this.toggleQueuePopup(false);
        this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    
        // Aggiungiamo gli event listener
        if (this._elements.volumeIcon) {
            this._elements.volumeIcon.addEventListener("click", this.boundOnVolumeIconClicked);
        }
        if (this._elements.volumeSlider) {
            this._elements.volumeSlider.addEventListener("input", this.boundOnVolumeChanged);
        }
        if (this._elements.playPause) {
            this._elements.playPause.addEventListener("click", this.boundOnPlayPause);
        }
        if (this._elements.nextTrack) {
            this._elements.nextTrack.addEventListener("click", this.boundOnNextTrack);
        }
        if (this._elements.prevTrack) {
            this._elements.prevTrack.addEventListener("click", this.boundOnPrevTrack);
        }
        if (this._elements.shuffle) {
            this._elements.shuffle.addEventListener("click", this.boundOnShuffleChanged);
        }
        if (this._elements.repeat) {
            this._elements.repeat.addEventListener("click", this.boundOnRepeatChanged);
        }
        if (this._elements.progressSlider) {
            this._elements.progressSlider.addEventListener("input", this.boundOnProgressChanged);
        }
        if (this._elements.queueButton) {
            this._elements.queueButton.addEventListener("click", this.boundOnQueueClicked);
        }
        if (this._elements.queueOverlay) {
            this._elements.queueOverlay.addEventListener("click", this.boundToggleQueuePopup);
        }
        document.addEventListener("click", this.boundHandleOutsideClick);
    }

    toggleQueuePopup(show) {
        if (show) {
            this._elements.queueOverlay.classList.remove("hidden");
            this._elements.queuePopup.classList.remove("hidden");
            document.addEventListener('click', this.handleOutsideClick);
        } else {
            this._elements.queueOverlay.classList.add("hidden");
            this._elements.queuePopup.classList.add("hidden");
            document.removeEventListener('click', this.handleOutsideClick);
        }
    }

    handleOutsideClick = (event) => {
        if (!this._elements.queuePopup.contains(event.target) && !event.target.closest('#queue')) {
            this.toggleQueuePopup(false);
        }
    }

    doUpdateConfig() {
        if (this.getHeader()) {
            this._elements.card.setAttribute("header", this.getHeader());
        } else {
            this._elements.card.removeAttribute("header");
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    lastKnownPosition = 0;
    playbackStartTime = 0;
    isPlaying = false;

    startProgressUpdate() {
        this.stopProgressUpdate();
        this.playbackStartTime = performance.now();
        this.isPlaying = true;
        this.progressInterval = setInterval(() => {
            this.updateProgress();
        }, 100);
    }

    stopProgressUpdate() {
        this.isPlaying = false;
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgress() {
        const state = this.getState();
        if (state && state.attributes.media_duration) {
            if (this.isPlaying) {
                const now = performance.now();
                const elapsed = (now - this.playbackStartTime) / 1000;
                this.lastKnownPosition += elapsed;
                this.playbackStartTime = now;
            }
    
            if (this.lastKnownPosition > state.attributes.media_duration) {
                this.lastKnownPosition = state.attributes.media_duration;
                this.stopProgressUpdate();
            }
    
            const progress = this.lastKnownPosition / state.attributes.media_duration;
            
            if (this._elements.progressSlider) {
                this._elements.progressSlider.value = progress * 100;
            } else {
                console.warn("Progress slider element not found");
            }
    
            this.updateSeekBarProgress(progress);
    
            if (this._elements.currentTime) {
                this._elements.currentTime.textContent = this.formatTime(this.lastKnownPosition);
            }
            if (this._elements.duration) {
                this._elements.duration.textContent = this.formatTime(state.attributes.media_duration);
            }
        }
    }

    updateSeekBarProgress(progress) {
        if (this._elements.progressBar) {
            const percent = (progress * 100).toFixed(2);
            this._elements.progressBar.style.width = `${percent}%`;
        }
    }

    doUpdateHass() {
        const state = this.getState();
        
        if (!state || state.state === "unavailable" || state.state === "idle") {
            if (this._elements.error) {
                this._elements.error.textContent = `Player ${this.getName()} non disponibile!`;
                this._elements.error.classList.remove("hidden");
            }
            if (this._elements.card) {
                this._elements.card.classList.add("unavailable");
            }
            
            this.hideElements();
            this.stopProgressUpdate();
            return;
        }
    
        this.showElements();
        
        if (state.attributes) {
            this.updateMediaInfo(state.attributes);
            this.updateControls(state);
        } else {
            console.error("Attributi dello stato non disponibili");
            if (this._elements.error) {
                this._elements.error.textContent = "Impossibile recuperare le informazioni del media";
                this._elements.error.classList.remove("hidden");
            }
        }
    
        this.updatePlaybackState(state);
    }
    
    hideElements() {
        ['mediaInfo', 'progressControl', 'volumeControl', 'mediaControls'].forEach(elementName => {
            const element = this._elements.card && this._elements.card.querySelector(`.${elementName}`);
            if (element) element.style.display = 'none';
        });
    }
    
    showElements() {
        if (this._elements.error) {
            this._elements.error.textContent = "";
            this._elements.error.classList.add("hidden");
        }
        if (this._elements.card) {
            this._elements.card.classList.remove("unavailable");
            ['mediaInfo', 'progressControl', 'volumeControl', 'mediaControls'].forEach(elementName => {
                const element = this._elements.card.querySelector(`.${elementName}`);
                if (element) element.style.display = 'flex';
            });
            this._elements.card.classList.add("loading");
        }
    }
    
    updateControls(state) {
        const isMuted = state.attributes.is_volume_muted;
        if (this._elements.volumeIcon) {
            const volumeIcon = isMuted ? "mdi:volume-off" : "mdi:volume-high";
            this._elements.volumeIcon.setAttribute("icon", volumeIcon);
        }
        
        if (!isMuted && this._elements.volumeSlider) {
            this._elements.volumeSlider.value = (state.attributes.volume_level || 0) * 100;
        }
    
        if (this._elements.playPause) {
            const playPauseIcon = state.state === "playing" ? "mdi:pause" : "mdi:play";
            this._elements.playPause.setAttribute("icon", playPauseIcon);
        }
    
        if (this._elements.shuffle) {
            const shuffleIcon = state.attributes.shuffle ? "mdi:shuffle" : "mdi:shuffle-disabled";
            this._elements.shuffle.setAttribute("icon", shuffleIcon);
        }
    
       if (this._elements.repeat) {
            const repeatIconMap = {
                'off': 'mdi:repeat-off',
                'all': 'mdi:repeat',
                'one': 'mdi:repeat-once'
            };
            const repeatIcon = repeatIconMap[state.attributes.repeat] || 'mdi:repeat-off';
            this._elements.repeat.setAttribute("icon", repeatIcon);
        }
    }

    hideProgressBar() {
        const progressControl = this.shadowRoot.querySelector('.progress-control');
        const bottomControls = this.shadowRoot.querySelector('.bottom-controls');
        
        if (progressControl) {
            progressControl.classList.add('sonos-hidden');
        } else {
            console.warn("Contenitore progress-control non trovato");
        }
        if (bottomControls) {
            bottomControls.classList.add('sonos-hidden');
        } else {
            console.warn("Contenitore bottom-controls non trovato");
        }
    }
    
    showProgressBar() {
        const progressControl = this.shadowRoot.querySelector('.progress-control');
        const bottomControls = this.shadowRoot.querySelector('.bottom-controls');
        if (progressControl) {
            progressControl.classList.remove('sonos-hidden');
        } else {
            console.warn("Contenitore progress-control non trovato");
        }
        if (bottomControls) {
            bottomControls.classList.remove('sonos-hidden');
        } else {
            console.warn("Contenitore bottom-controls non trovato");
        }
    }    
    
    updatePlaybackState(state) {
        if (state.attributes.media_title !== this._lastKnownTitle || state.state !== "playing") {
            this.lastKnownPosition = state.attributes.media_position || 0;
            this._lastKnownTitle = state.attributes.media_title;
        }
        this.lastUpdateTime = performance.now();
    
        if (this._elements.card) this._elements.card.classList.remove("loading");
    
        if (state.state === "playing" && !this.isPlaying) {
            this.playbackStartTime = performance.now();
            this.startProgressUpdate();
        } else if (state.state !== "playing" && this.isPlaying) {
            this.stopProgressUpdate();
            this.updateProgress();
        }
    
        if (this._elements.queuePopup && !this._elements.queuePopup.classList.contains('hidden')) {
            this.updateCurrentTrack();
        }
    }

    updateCurrentTrack() {
        const playerState = this.getState();
        const currentTrackNumber = playerState.attributes.queue_position;
    
        const allTracks = this._elements.queueList.querySelectorAll('li');
        allTracks.forEach((track, index) => {
            track.classList.toggle('current-track', index === currentTrackNumber - 1);
            const playingIcon = track.querySelector('.playing-icon');
            if (index === currentTrackNumber - 1) {
                if (!playingIcon) {
                    const icon = document.createElement('ha-icon');
                    icon.setAttribute('class', 'playing-icon');
                    icon.setAttribute('icon', 'mdi:play-circle-outline');
                    track.appendChild(icon);
                }
            } else if (playingIcon) {
                playingIcon.remove();
            }
        });
    }

    doToggle() {
        this._hass.callService("input_boolean", "toggle", {
            entity_id: this.getEntityID(),
        });
    }

    connectedCallback() {
        if (super.connectedCallback) {
            super.connectedCallback();
        }
        this.doQueryElements();
        this.doListen();
    }

    disconnectedCallback() {
        if (super.disconnectedCallback) {
            super.disconnectedCallback();
        }
        this.stopProgressUpdate();
        this.removeEventListeners();
    }

    removeEventListeners() {
        if (this._elements.volumeIcon) {
            this._elements.volumeIcon.removeEventListener("click", this.boundOnVolumeIconClicked);
        }
        if (this._elements.volumeSlider) {
            this._elements.volumeSlider.removeEventListener("input", this.boundOnVolumeChanged);
        }
        if (this._elements.playPause) {
            this._elements.playPause.removeEventListener("click", this.boundOnPlayPause);
        }
        if (this._elements.nextTrack) {
            this._elements.nextTrack.removeEventListener("click", this.boundOnNextTrack);
        }
        if (this._elements.prevTrack) {
            this._elements.prevTrack.removeEventListener("click", this.boundOnPrevTrack);
        }
        if (this._elements.shuffle) {
            this._elements.shuffle.removeEventListener("click", this.boundOnShuffleChanged);
        }
        if (this._elements.repeat) {
            this._elements.repeat.removeEventListener("click", this.boundOnRepeatChanged);
        }
        if (this._elements.progressSlider) {
            this._elements.progressSlider.removeEventListener("input", this.boundOnProgressChanged);
        }
        if (this._elements.queueButton) {
            this._elements.queueButton.removeEventListener("click", this.boundOnQueueClicked);
        }
        if (this._elements.queueOverlay) {
            this._elements.queueOverlay.removeEventListener("click", this.boundToggleQueuePopup);
        }
        document.removeEventListener("click", this.boundHandleOutsideClick);
    }

    static getConfigElement() {
        return document.createElement("toggle-with-graphical-configuration-editor");
    }

    static getStubConfig() {
        return {
            entity: "input_boolean.twgc",
            header: "",
        };
    }
}

if (!customElements.get('sonos-custom-player-card')) {
    customElements.define('sonos-custom-player-card', SonosCustomPlayerCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
    type: "sonos-custom-player-card",
    name: "Sonos custom player card",
    description: "Sonos custom player card (Vanilla JS)",
});
