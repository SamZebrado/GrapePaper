import { lazy, Suspense, useEffect, useState } from 'react';
import ReadingWorkspace from './reader/ReadingWorkspace';
import type { ZoteroHandoff } from './reader/protocol';
import { listenForHandoffs, routeHandoff } from './reader/handoffChannel';

const Editor = lazy(() => import('./App'));
export default function GrapeApplication({ incoming }: { incoming: ZoteroHandoff | null }) {
  const [mode, setMode] = useState<'read'|'edit'>('read');
  const [handoff, setHandoff] = useState<ZoteroHandoff | null>(null);
  const [routing, setRouting] = useState(!!incoming);
  const [forwarded, setForwarded] = useState(false);
  const [readHere, setReadHere] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let stopListening: (() => void) | undefined;
    const listen = () => { stopListening = listenForHandoffs(payload => { setHandoff(payload); setMode('read'); setForwarded(false); }); };
    if (incoming && !readHere) {
      void routeHandoff(incoming, {signal:controller.signal}).then(sent => {
        if(controller.signal.aborted) return;
        setRouting(false); setForwarded(sent);
        if(!sent) { setHandoff(incoming); listen(); }
      });
    } else listen();
    return () => { controller.abort(); stopListening?.(); };
  }, [incoming, readHere]);
  return <div className="grapeApplication">
    <header className="grapeTopbar"><div className="grapeBrand"><svg aria-hidden="true" viewBox="0 0 40 44"><path d="M20 10q1-8 11-7q-2 10-11 7M18 13q-7-6-13-1" fill="#6c8251" stroke="#516d3e" strokeWidth="2"/>{[[13,18],[25,18],[8,27],[20,28],[31,27],[14,36],[26,36],[20,42]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy-3} r="5" fill="#87638d"/>)}</svg><span>GrapePaper<small>葡萄伴读</small></span></div><nav aria-label="工作区"><button aria-pressed={mode==='read'} onClick={()=>setMode('read')}>文献伴读</button><button aria-pressed={mode==='edit'} onClick={()=>setMode('edit')}>葡萄笔记</button></nav></header>
    <div hidden={mode !== 'read'}>{routing ? <p className="handoffForwarded">正在接入伴读窗口…</p> : forwarded ? <div className="handoffForwarded"><h1>选段已送到打开的伴读窗口。</h1><p>可以关闭此页，在原窗口继续阅读。本次计数会接着保留。</p><button onClick={()=>{setForwarded(false);setHandoff(incoming);setReadHere(true);}}>也在这里阅读</button></div> : <ReadingWorkspace handoff={handoff}/>}</div>
    {mode==='edit' && <div className="grapeEditor"><button className="editorReturn" onClick={()=>setMode('read')}>返回文献伴读</button><Suspense fallback={<p>正在打开笔记…</p>}><Editor/></Suspense></div>}
  </div>;
}
