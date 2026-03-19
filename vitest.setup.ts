import { config } from '@vue/test-utils';

config.global.mocks = { t: (msg: string) => msg };
config.global.stubs = { 'b-row': true };
