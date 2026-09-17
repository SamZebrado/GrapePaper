export const DEFAULT_COMPANION_ENDPOINT = import.meta.env.MODE === 'pages' ? '' : '/api/companion';

export function companionEndpoint(value: string): string {
  const url = new URL(value.trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('请使用 HTTPS 服务，或本机 localhost 地址。');
  if (url.username || url.password || url.search || url.hash) throw new Error('服务地址不应包含密码、查询参数或片段。API 密钥请配置在服务端。');
  if (!url.pathname.endsWith('/api/companion')) url.pathname = url.pathname.replace(/\/$/, '') + '/api/companion';
  return url.href;
}
