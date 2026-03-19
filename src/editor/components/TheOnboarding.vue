<template>
  <div v-if="visible" class="onboarding-overlay" @click.self="dismiss">
    <div class="onboarding-card">
      <div class="onboarding-step-indicator">
        <span
          v-for="i in totalSteps"
          :key="i"
          class="step-dot"
          :class="{ active: i === step }"
        />
      </div>

      <div class="onboarding-content">
        <div v-if="step === 1" class="step">
          <div class="step-icon">&#x1F3AF;</div>
          <h3>Pick an Element</h3>
          <p>Click the crosshair icon in the top-left, then click any element on the page to select it for styling.</p>
        </div>

        <div v-if="step === 2" class="step">
          <div class="step-icon">&#x1F3A8;</div>
          <h3>Style It Visually</h3>
          <p>Use the property panels to change fonts, colors, spacing, and borders. Changes are saved instantly and appear on every visit.</p>
        </div>

        <div v-if="step === 3" class="step">
          <div class="step-icon">&#x1F680;</div>
          <h3>Try Snippets & Recipes</h3>
          <p>Browse ready-made Snippets for quick effects, or try Site Recipes for one-click improvements to popular websites.</p>
        </div>
      </div>

      <div class="onboarding-actions">
        <button v-if="step > 1" class="onboarding-btn secondary" @click="step--">
          Back
        </button>
        <button v-if="step < totalSteps" class="onboarding-btn primary" @click="step++">
          Next
        </button>
        <button v-if="step === totalSteps" class="onboarding-btn primary" @click="dismiss">
          Get Started
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

const ONBOARDING_KEY = 'stylekit-onboarding-done';

export default defineComponent({
  name: 'TheOnboarding',

  data() {
    return {
      visible: false,
      step: 1,
      totalSteps: 3,
    };
  },

  async created() {
    const result = await chrome.storage.local.get(ONBOARDING_KEY);
    if (!result[ONBOARDING_KEY]) {
      this.visible = true;
    }
  },

  methods: {
    dismiss(): void {
      this.visible = false;
      chrome.storage.local.set({ [ONBOARDING_KEY]: true });
    },
  },
});
</script>

<style lang="scss" scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  z-index: 999999999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.onboarding-card {
  background: #1e1e2e;
  border: 1px solid #45475a;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 380px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.onboarding-step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #45475a;
  transition: background 0.2s;

  &.active {
    background: #89b4fa;
  }
}

.onboarding-content {
  text-align: center;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step {
  h3 {
    color: #cdd6f4;
    font-size: 18px;
    font-weight: 600;
    margin: 8px 0;
  }

  p {
    color: #a6adc8;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }
}

.step-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.onboarding-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
}

.onboarding-btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;

  &.primary {
    background: #89b4fa;
    color: #1e1e2e;

    &:hover {
      background: #b4d0fb;
    }
  }

  &.secondary {
    background: #313244;
    color: #cdd6f4;

    &:hover {
      background: #45475a;
    }
  }
}
</style>
