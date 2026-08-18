export function subscribe(onEvent) {
  const source = new EventSource('/api/events');
  source.onmessage = ({ data }) => { try { onEvent(JSON.parse(data)); } catch {} };
  return () => source.close();
}
