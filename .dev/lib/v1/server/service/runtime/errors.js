const errors = new Map();

export const errorOf = (chatId) => errors.get(chatId) ?? '';
export const clearError = (chatId) => errors.delete(chatId);
export const setError = (chatId, message) => errors.set(chatId, String(message ?? ''));
