<template>
  <div
    v-if="supported"
    class="speech-controls"
    aria-label="Read aloud controls"
  >
    <button type="button" class="speech-button" @click="togglePlayback">
      {{ playbackLabel }}
    </button>
    <button
      v-if="state.status !== 'idle'"
      type="button"
      class="speech-button"
      @click="stop"
    >
      Stop
    </button>
    <label class="speech-rate">
      <span>Speed</span>
      <select
        v-model.number="rate"
        aria-label="Reading speed"
        @change="changeRate"
      >
        <option v-for="option in rates" :key="option" :value="option">
          {{ option }}×
        </option>
      </select>
    </label>
    <span class="speech-status" role="status" aria-live="polite">
      {{ statusText }}
    </span>
  </div>
  <p v-else class="speech-unavailable">
    Read aloud is not available in this browser.
  </p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ReaderSpeechController, type ReaderSpeechState } from '../speech';

const idleState = (): ReaderSpeechState => ({
  status: 'idle',
  rate: 1,
  chunk: 0,
  totalChunks: 0,
});

export default defineComponent({
  name: 'TheSpeechControls',

  props: {
    text: {
      type: String,
      required: true,
    },
  },

  data(): {
    controller: ReaderSpeechController | null;
    supported: boolean;
    rate: number;
    rates: number[];
    state: ReaderSpeechState;
  } {
    return {
      controller: null,
      supported: false,
      rate: 1,
      rates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      state: idleState(),
    };
  },

  computed: {
    playbackLabel(): string {
      if (this.state.status === 'speaking') return 'Pause';
      if (this.state.status === 'paused') return 'Resume';
      return 'Read aloud';
    },

    statusText(): string {
      if (this.state.error) return this.state.error;
      if (this.state.status === 'paused') return 'Paused';
      if (this.state.status === 'speaking') {
        return `Reading section ${this.state.chunk} of ${this.state.totalChunks}`;
      }
      return '';
    },
  },

  watch: {
    text(): void {
      this.stop();
    },
  },

  mounted(): void {
    this.supported = Boolean(
      window.speechSynthesis && window.SpeechSynthesisUtterance
    );
    if (!this.supported) return;
    this.controller = new ReaderSpeechController(
      window.speechSynthesis,
      text => new SpeechSynthesisUtterance(text),
      state => {
        this.state = state;
      }
    );
  },

  beforeUnmount(): void {
    this.controller?.stop();
  },

  methods: {
    togglePlayback(): void {
      if (!this.controller) return;
      if (this.state.status === 'speaking') this.controller.pause();
      else if (this.state.status === 'paused') this.controller.resume();
      else this.controller.start(this.text, this.rate);
    },

    stop(): void {
      this.controller?.stop();
    },

    changeRate(): void {
      this.controller?.setRate(this.rate);
    },
  },
});
</script>

<style lang="scss" scoped>
.speech-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0 24px;
  font-size: 14px;
  line-height: 1.4;
}

.speech-button,
.speech-rate select {
  min-height: 34px;
  border: 1px solid currentColor;
  border-radius: 5px;
  background: transparent;
  color: inherit;
}

.speech-button {
  padding: 5px 12px;
  cursor: pointer;
}

.speech-rate {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  select {
    padding: 4px 8px;
  }
}

.speech-status,
.speech-unavailable {
  color: inherit;
  font-size: 13px;
  opacity: 0.75;
}
</style>
