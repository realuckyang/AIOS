/**
 * 把字节流切成 SSE 事件。
 *
 * 一个网络 chunk 不一定对应一个完整事件，所以必须积累到空行后再解析。
 * `[DONE]` 不是 JSON；未知或损坏的帧跳过，不让整条响应流中断。
 */
export async function* sse(stream) {
  const decoder = new TextDecoder();
  let carry = '';

  for await (const chunk of stream) {
    carry += decoder.decode(chunk, { stream: true });

    let cut;
    while ((cut = carry.indexOf('\n\n')) !== -1) {
      const block = carry.slice(0, cut);
      carry = carry.slice(cut + 2);

      const line = block.split('\n').find((one) => one.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try { yield JSON.parse(payload); } catch { /* 跳过无法识别的帧 */ }
    }
  }
}
