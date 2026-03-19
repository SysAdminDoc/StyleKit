/* eslint-disable */
const VueTestUtils = require('@vue/test-utils');

VueTestUtils.config.mocks['t'] = msg => msg;
VueTestUtils.config.stubs = { 'b-row': true };
