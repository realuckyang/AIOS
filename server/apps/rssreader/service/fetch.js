const parseRss = (xml) => {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '';
    const link = (block.match(/<link[^>]*href="([^"]*)"/) || block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || '';
    const desc = (block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) ||
                  block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) ||
                     block.match(/<published[^>]*>([\s\S]*?)<\/published>/) ||
                     block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/) || [])[1] || '';
    const cleanDesc = desc.replace(/<[^>]+>/g, '').trim().slice(0, 300);
    if (title.trim()) items.push({ title: title.trim(), url: link.trim(), description: cleanDesc, pubDate: pubDate.trim() });
  }
  return items.slice(0, 30);
};

const fetchFeed = async ({ url }) => {
  if (!url) return { status: 400, message: "url is required" };
  const res = await fetch(url, { headers: { "User-Agent": "AIOS-RSS/1.0", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
  if (!res.ok) throw new Error(`RSS fetch error ${res.status}`);
  const xml = await res.text();
  const items = parseRss(xml);
  return { success: true, items };
};

export { fetchFeed };
