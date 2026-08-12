import { reloadDueStyleSources } from './style-source';

const ALARM_NAME = 'style-source-reload';

export const initializeStyleSourceScheduler = async (): Promise<void> => {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: 1,
    });
  }

  await reloadDueStyleSources();
};

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    void reloadDueStyleSources();
  }
});

export const STYLE_SOURCE_ALARM_NAME = ALARM_NAME;
