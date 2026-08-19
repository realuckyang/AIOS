import { settings } from '../../repository/index.js';

export function runtimeSettings() {
  return {
    llm: {
      responsesUrl: settings.get('llm.responses_url'),
      key: settings.get('llm.key'),
      model: settings.get('llm.model'),
    },
    context: {
      window: settings.number('context.window'),
      reserve: settings.number('context.reserve'),
      keepRecent: settings.number('context.keep_recent'),
      liveResultChars: settings.number('context.live_result_chars'),
    },
    prompt: {
      chat: settings.get('prompt.chat'),
      compaction: settings.get('prompt.compaction'),
    },
  };
}
