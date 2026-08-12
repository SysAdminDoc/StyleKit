<template>
  <div class="animation-editor">
    <div v-if="!activeSelector" class="animation-empty">
      Select an element first
    </div>

    <template v-else>
      <div class="animation-timeline" aria-label="Animation timeline">
        <div class="animation-track">
          <button
            v-for="(keyframe, index) in sortedKeyframes"
            :key="`${keyframe.offset}-${index}`"
            type="button"
            class="animation-marker"
            :class="{ active: keyframe === selectedKeyframe }"
            :style="{ left: `${keyframe.offset}%` }"
            :aria-label="`Edit keyframe at ${keyframe.offset} percent`"
            @click="selectKeyframe(keyframe)"
          />
        </div>
        <div class="animation-scale" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="animation-settings">
        <label>
          Duration
          <span>
            <input
              v-model.number="durationMs"
              type="number"
              min="1"
              max="60000"
            />
            ms
          </span>
        </label>
        <label>
          Delay
          <span>
            <input v-model.number="delayMs" type="number" min="0" max="60000" />
            ms
          </span>
        </label>
        <label>
          Easing
          <select v-model="timingFunction">
            <option value="linear">Linear</option>
            <option value="ease">Ease</option>
            <option value="ease-in">Ease in</option>
            <option value="ease-out">Ease out</option>
            <option value="ease-in-out">Ease in out</option>
          </select>
        </label>
        <label>
          Iterations
          <select v-model="iterationCount">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="infinite">Infinite</option>
          </select>
        </label>
        <label>
          Direction
          <select v-model="direction">
            <option value="normal">Normal</option>
            <option value="reverse">Reverse</option>
            <option value="alternate">Alternate</option>
            <option value="alternate-reverse">Alternate reverse</option>
          </select>
        </label>
        <label>
          Fill
          <select v-model="fillMode">
            <option value="none">None</option>
            <option value="forwards">Forwards</option>
            <option value="backwards">Backwards</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>

      <div v-if="selectedKeyframe" class="keyframe-editor">
        <div class="keyframe-heading">
          <label>
            Keyframe
            <input
              :value="selectedKeyframe.offset"
              type="number"
              min="0"
              max="100"
              aria-label="Selected keyframe percentage"
              @input="updateSelectedOffset"
            />
            %
          </label>
          <button
            type="button"
            :disabled="keyframes.length <= 2"
            @click="removeSelectedKeyframe"
          >
            Remove
          </button>
        </div>
        <textarea
          v-model="selectedKeyframe.declarations"
          rows="3"
          aria-label="Keyframe CSS declarations"
          spellcheck="false"
        />
      </div>

      <div class="animation-actions">
        <button type="button" @click="addKeyframe">+ Add keyframe</button>
        <button type="button" class="primary" @click="applyAndReplay">
          Apply &amp; Replay
        </button>
        <button type="button" class="danger" @click="clearAnimation">
          Remove animation
        </button>
      </div>

      <div v-if="error" class="animation-error" role="alert">{{ error }}</div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  getAnimationName,
  removeAnimation,
  upsertAnimation,
  type AnimationConfig,
  type AnimationKeyframe,
} from '../utils/animation';

const createDefaultKeyframes = (): AnimationKeyframe[] => [
  {
    offset: 0,
    declarations: 'opacity: 0; transform: translateY(12px);',
  },
  {
    offset: 100,
    declarations: 'opacity: 1; transform: translateY(0);',
  },
];

export default defineComponent({
  name: 'TheAnimationEditor',

  data(): {
    durationMs: number;
    delayMs: number;
    timingFunction: string;
    iterationCount: string;
    direction: string;
    fillMode: string;
    keyframes: AnimationKeyframe[];
    selectedKeyframe: AnimationKeyframe | null;
    error: string;
  } {
    const keyframes = createDefaultKeyframes();
    return {
      durationMs: 800,
      delayMs: 0,
      timingFunction: 'ease-in-out',
      iterationCount: '1',
      direction: 'normal',
      fillMode: 'both',
      keyframes,
      selectedKeyframe: keyframes[0],
      error: '',
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    animationName(): string {
      return getAnimationName(this.activeSelector);
    },

    sortedKeyframes(): AnimationKeyframe[] {
      return [...this.keyframes].sort(
        (left, right) => left.offset - right.offset
      );
    },
  },

  watch: {
    activeSelector(): void {
      const keyframes = createDefaultKeyframes();
      this.keyframes = keyframes;
      this.selectedKeyframe = keyframes[0];
      this.error = '';
    },
  },

  methods: {
    animationConfig(): AnimationConfig {
      return {
        name: this.animationName,
        durationMs: this.durationMs,
        delayMs: this.delayMs,
        timingFunction: this.timingFunction,
        iterationCount: this.iterationCount,
        direction: this.direction,
        fillMode: this.fillMode,
        keyframes: this.keyframes,
      };
    },

    selectKeyframe(keyframe: AnimationKeyframe): void {
      this.selectedKeyframe = keyframe;
      this.error = '';
    },

    updateSelectedOffset(event: Event): void {
      if (!this.selectedKeyframe) return;
      const value = Number((event.target as HTMLInputElement).value);
      this.selectedKeyframe.offset = Math.min(100, Math.max(0, value));
    },

    addKeyframe(): void {
      const sorted = this.sortedKeyframes;
      let largestGap = -1;
      let offset = 50;
      for (let index = 1; index < sorted.length; index += 1) {
        const gap = sorted[index].offset - sorted[index - 1].offset;
        if (gap > largestGap) {
          largestGap = gap;
          offset = Math.round(
            (sorted[index].offset + sorted[index - 1].offset) / 2
          );
        }
      }
      const keyframe = { offset, declarations: 'opacity: 1;' };
      this.keyframes.push(keyframe);
      this.selectedKeyframe = keyframe;
      this.error = '';
    },

    removeSelectedKeyframe(): void {
      if (!this.selectedKeyframe || this.keyframes.length <= 2) return;
      const index = this.keyframes.indexOf(this.selectedKeyframe);
      this.keyframes.splice(index, 1);
      this.selectedKeyframe = this.sortedKeyframes[0] || null;
      this.error = '';
    },

    applyAndReplay(): void {
      try {
        const css = upsertAnimation(
          this.$store.state.css,
          this.activeSelector,
          this.animationConfig()
        );
        this.$store.dispatch('applyCss', { css });
        this.error = '';
        window.setTimeout(() => this.replay(), 0);
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : 'Could not apply animation.';
      }
    },

    replay(): void {
      let elements: Element[] = [];
      try {
        elements = [...document.querySelectorAll(this.activeSelector)];
      } catch {
        this.error = 'The selected element could not be found.';
        return;
      }
      elements.forEach(element => {
        element.getAnimations().forEach(animation => {
          const cssAnimation = animation as Animation & {
            animationName?: string;
          };
          if (cssAnimation.animationName === this.animationName) {
            animation.cancel();
            animation.play();
          }
        });
      });
    },

    clearAnimation(): void {
      const css = removeAnimation(
        this.$store.state.css,
        this.activeSelector,
        this.animationName
      );
      if (css !== this.$store.state.css) {
        this.$store.dispatch('applyCss', { css });
      }
      this.error = '';
    },
  },
});
</script>

<style lang="scss" scoped>
.animation-editor {
  color: #cdd6f4;
  font-size: 11px;
}

.animation-empty {
  color: #6c7086;
  padding: 12px 0;
  text-align: center;
}

.animation-timeline {
  padding: 10px 8px 2px;
}

.animation-track {
  position: relative;
  height: 4px;
  margin: 0 7px;
  background: #45475a;
  border-radius: 2px;
}

.animation-marker {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  padding: 0;
  transform: translate(-50%, -50%) rotate(45deg);
  border: 2px solid #1e1e2e;
  border-radius: 3px;
  background: #a6adc8;
  cursor: pointer;

  &.active {
    background: #89b4fa;
    box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.25);
  }
}

.animation-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #6c7086;
  font-size: 9px;
}

.animation-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin: 8px 0;

  label {
    color: #a6adc8;
  }

  label > span {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
    height: 25px;
    margin-top: 2px;
    padding: 2px 5px;
    color: #cdd6f4;
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 3px;
    font-size: 10px;
  }
}

.keyframe-editor {
  margin-top: 8px;
}

.keyframe-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;

  input {
    width: 45px;
    color: #cdd6f4;
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 3px;
    font-size: 10px;
  }
}

textarea {
  width: 100%;
  padding: 6px;
  resize: vertical;
  color: #cdd6f4;
  background: #181825;
  border: 1px solid #45475a;
  border-radius: 4px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 10px;
}

.animation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

button {
  padding: 3px 7px;
  color: #89b4fa;
  background: transparent;
  border: 1px solid #45475a;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;

  &:disabled {
    color: #585b70;
    cursor: default;
  }

  &.primary {
    color: #1e1e2e;
    background: #89b4fa;
    border-color: #89b4fa;
  }

  &.danger {
    color: #f38ba8;
    border-color: rgba(243, 139, 168, 0.4);
  }
}

.animation-error {
  margin-top: 6px;
  color: #f38ba8;
}
</style>
