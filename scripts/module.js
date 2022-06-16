Sound.prototype.load = async function loadv2({ autoplay = false, autoplayOptions = {} } = {}) {

    // Delay audio loading until after an observed user gesture
    if (game.audio.locked) {
        console.log(`${vtt} | Delaying load of sound ${this.src} until after first user gesture`);
        await new Promise(resolve => game.audio.pending.push(resolve));
    }

    // Currently loading
    if (this.loading instanceof Promise) await this.loading;

    // If loading is required, cache the promise for idempotency
    if (!this.container || this.container.loadState === AudioContainer.LOAD_STATES.NONE) {
        this.loading = this.container.load();
        await this.loading;
        this.loading = undefined;
    }
    this.container.element.playbackRate = autoplayOptions.playback
    // Trigger automatic playback actions
    if (autoplay) this.play(autoplayOptions);
    return this;
}

PlaylistSound.prototype.sync = function sync() {
    if (!this.sound || this.sound.failed) return;
    const fade = this.fadeDuration;

    // Conclude current playback
    if (!this.playing) {
        if (fade && !this.data.pausedTime && this.sound.playing) {
            return this.sound.fade(0, { duration: fade }).then(() => this.sound.stop());
        }
        else return this.sound.stop();
    }

    // Determine playback configuration
    const playback = {
        loop: this.data.repeat,
        volume: this.volume,
        fade: fade,
        playback: this.data.flags?.playback?.speed || 1
    };
    if (this.data.pausedTime && this.playing && !this.sound.playing) playback.offset = this.data.pausedTime;

    // Load and autoplay, or play directly if already loaded
    if (this.sound.loaded) return this.sound.play(playback);
    return this.sound.load({ autoplay: true, autoplayOptions: playback });
}

PlaylistSound.prototype._fadeIn = function newFade(sound) {
    if ( !sound.node ) return;
    const fade = this.data.flags?.playback?.fadein ?? this.fadeDuration;
    if ( !fade || sound.pausedTime ) return;
    sound.fade(this.volume, {duration: fade, from: 0});
  }

  PlaylistSound.prototype._fadeOut = function newFade(sound) {
    if ( !sound.node ) return;
    const fade = this.data.flags?.playback?.fadeout ?? this.fadeDuration;
    if ( !fade ) return;
    sound.fade(0, {duration: fade});
  }

Hooks.on("renderPlaylistSoundConfig", (config, html, css) => {
    const speed = config.object.getFlag("playback", "speed")
    const fadein = config.object.getFlag("playback", "fadein")
    const fadeout = config.object.getFlag("playback", "fadeout")
    let lastBox = html.find("input[name='fade']").closest(".form-group")
    let checkboxHTML = `
      <div class="form-group">
          <label>Playback Speed</label>
          <input type="number" name="flags.playback.speed" step="any" min="0.1" value="${speed || 1}">
      </div>
      <div class="form-group">
          <label>Fade-In Time</label>
          <input type="number" name="flags.playback.fadein" step="any" min="0" value="${fadein || 0}">
      </div>
      <div class="form-group">
          <label>Fade-Out Time</label>
          <input type="number" name="flags.playback.fadeout" step="any" min="0" value="${fadeout || 0}">
      </div>
      `
    lastBox.after(checkboxHTML)
})