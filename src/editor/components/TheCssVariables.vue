<template>
  <div class="css-variables">
    <div
      v-for="(variable, index) in variables"
      :key="index"
      class="css-variable-row"
    >
      <b-form-input
        size="sm"
        class="var-name"
        :value="variable.name"
        placeholder="--var-name"
        autocomplete="off"
        @input="updateName(index, $event)"
      />

      <b-form-input
        size="sm"
        class="var-value"
        :value="variable.value"
        placeholder="value"
        autocomplete="off"
        @input="updateValue(index, $event)"
      />

      <b-button
        size="sm"
        variant="link"
        class="remove-btn"
        @click="removeVariable(index)"
      >
        &times;
      </b-button>
    </div>

    <b-button
      size="sm"
      variant="link"
      class="add-btn"
      @click="addVariable"
    >
      + Add Variable
    </b-button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as postcss from 'postcss';

type CssVariable = {
  name: string;
  value: string;
};

export default Vue.extend({
  name: 'TheCssVariables',

  data(): { variables: CssVariable[] } {
    return {
      variables: [],
    };
  },

  computed: {
    css(): string {
      return this.$store.state.css;
    },
  },

  watch: {
    css: {
      immediate: true,
      handler(css: string) {
        this.parseVariablesFromCss(css);
      },
    },
  },

  methods: {
    parseVariablesFromCss(css: string): void {
      if (!css) {
        this.variables = [];
        return;
      }

      try {
        const root = postcss.parse(css);
        const vars: CssVariable[] = [];

        root.walkRules(':root', rule => {
          rule.walkDecls(/^--/, decl => {
            vars.push({ name: decl.prop, value: decl.value });
          });
        });

        // Only update if different to avoid cursor jumping
        const current = JSON.stringify(this.variables);
        const parsed = JSON.stringify(vars);
        if (current !== parsed) {
          this.variables = vars;
        }
      } catch {
        // ignore parse errors
      }
    },

    addVariable(): void {
      this.variables.push({ name: '--', value: '' });
    },

    removeVariable(index: number): void {
      this.variables.splice(index, 1);
      this.applyVariables();
    },

    updateName(index: number, name: string): void {
      this.variables[index].name = name;
      this.applyVariables();
    },

    updateValue(index: number, value: string): void {
      this.variables[index].value = value;
      this.applyVariables();
    },

    applyVariables(): void {
      const validVars = this.variables.filter(
        v => v.name.startsWith('--') && v.name.length > 2 && v.value
      );

      let css = this.css;

      try {
        const root = postcss.parse(css);

        // Remove existing :root rule
        root.walkRules(':root', rule => rule.remove());

        // Add new :root rule if there are variables
        if (validVars.length > 0) {
          const declarations = validVars
            .map(v => `  ${v.name}: ${v.value};`)
            .join('\n');
          const rootRule = `:root {\n${declarations}\n}`;

          // Prepend :root at the top
          const existingCss = root.toString().trim();
          css = existingCss ? `${rootRule}\n\n${existingCss}` : rootRule;
        } else {
          css = root.toString();
        }

        this.$store.dispatch('applyCss', { css });
      } catch {
        // ignore
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.css-variable-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.var-name {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px !important;
  flex: 1;
}

.var-value {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px !important;
  flex: 1;
}

.remove-btn {
  font-size: 16px;
  padding: 0 4px;
  color: #999;
  text-decoration: none;
  line-height: 1;

  &:hover {
    color: #f38ba8;
  }
}

.add-btn {
  font-size: 12px;
  padding: 2px 0;
  color: #89b4fa;
  text-decoration: none;

  &:hover {
    color: #b4d0fb;
  }
}
</style>
