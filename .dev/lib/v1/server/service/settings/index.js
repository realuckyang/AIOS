import { settings } from '../../repository/index.js';
export { runtimeSettings } from './runtime.js';

const visible = (key, value) => key === 'llm.key'
  ? { value: '', configured: Boolean(value) }
  : { value, configured: true };

export function list() {
  return Object.fromEntries(Object.entries(settings.list()).map(([key, value]) => [key, visible(key, value)]));
}

export function set(key, value) {
  return { key, ...visible(key, settings.set(key, value)) };
}
