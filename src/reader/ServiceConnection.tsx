import { useEffect, useRef, useState } from 'react';
import { companionEndpoint } from './serviceConnection';

export default function ServiceConnection({ endpoint, onConnect }: { endpoint: string; onConnect: (endpoint: string) => void }) {
  const [address, setAddress] = useState(endpoint.startsWith('http') ? endpoint : '');
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const connect = async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setChecking(true); setStatus('');
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const target = companionEndpoint(address);
      const health = target.replace(/\/companion$/, '/health');
      const response = await fetch(health, { signal: controller.signal, credentials: 'omit' });
      const data = await response.json();
      if (!response.ok || data.status !== 'ok') throw new Error('这个地址没有返回 GrapePaper 伴读服务。请检查地址。');
      if (!data.configured) throw new Error('服务已启动，但尚未配置模型。请先在服务端设置模型名称与 API。');
      if (pending.current !== controller || controller.signal.aborted) return;
      onConnect(target); setStatus('已连接。选段会在你点击生成或开启自动伴读后发送。');
    } catch (error) {
      if (pending.current === controller) setStatus(error instanceof TypeError || controller.signal.aborted ? '未能连接。请确认服务已启动并允许此网页访问；本机服务可能需要浏览器的本地网络权限。' : error instanceof Error ? error.message : '连接失败。');
    } finally { clearTimeout(timer); if (pending.current === controller) setChecking(false); }
  };
  return <div className="serviceConnection">
    <h3>连接 AI 伴读</h3>
    <p>网页可以直接打开 PDF。实时中文解读、引用实验和故事卡需要连接你自己的 GrapePaper 伴读服务。API 密钥留在服务端。</p>
    <label>伴读服务地址<input type="url" value={address} maxLength={2000} placeholder="http://127.0.0.1:8787" onChange={e => { pending.current?.abort(); pending.current = null; setChecking(false); setAddress(e.target.value); setStatus(''); }}/></label>
    <div className="serviceButtons"><button disabled={!address.trim() || checking} onClick={() => void connect()}>{checking ? '正在连接…' : '测试并连接'}</button>{endpoint && <button onClick={() => {pending.current?.abort();pending.current=null;setChecking(false);onConnect('');setStatus('已断开；PDF、阅读确认和提示词仍可使用。');}}>断开 AI</button>}<a href="https://github.com/SamZebrado/GrapePaper/blob/main/docs/companion-api.md" target="_blank" rel="noopener noreferrer">服务配置说明 ↗</a></div>
    {status && <p role="status">{status}</p>}
    <small>{endpoint ? `当前服务：${endpoint}` : '尚未连接 AI · 可先试读示例、复制提示词或导入伴读。'}<br/>地址仅保留在本次页面中。连接测试不会发送文章内容。</small>
  </div>;
}
