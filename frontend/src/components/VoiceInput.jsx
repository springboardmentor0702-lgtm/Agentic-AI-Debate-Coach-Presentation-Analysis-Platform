import {useRef,useState} from 'react';
import {Mic,MicOff} from 'lucide-react';

export default function VoiceInput({onText,onLevel,onMetrics}){
  const [on,setOn]=useState(false); const recognition=useRef(null); const stream=useRef(null); const audio=useRef(null); const raf=useRef(null);
  const meter=useRef({started:0,active:0,paused:0,pauses:0,levels:[],pitch:[]});
  const stopMeter=()=>{
    if(raf.current)cancelAnimationFrame(raf.current); raf.current=null;
    const m=meter.current; const ended=performance.now();
    if(m.started){
      const duration=Math.max(0,(ended-m.started)/1000);
      const levels=m.levels.length?m.levels:[0];
      const avg=levels.reduce((a,b)=>a+b,0)/levels.length;
      const peak=Math.max(...levels);
      const variance=levels.reduce((a,b)=>a+(b-avg)**2,0)/levels.length;
      const pitch=m.pitch.filter(Number.isFinite);
      onMetrics?.({duration_seconds:+duration.toFixed(2),active_seconds:+(m.active/1000).toFixed(2),pause_seconds:+(m.paused/1000).toFixed(2),pause_count:m.pauses,average_volume:+avg.toFixed(3),peak_volume:+peak.toFixed(3),volume_variation:+Math.sqrt(variance).toFixed(3),pitch_hz_range:pitch.length?{min:+Math.min(...pitch).toFixed(1),max:+Math.max(...pitch).toFixed(1)}:null,source:'browser_microphone_estimate'});
    }
    meter.current={started:0,active:0,paused:0,pauses:0,levels:[],pitch:[]};
    audio.current?.close?.(); audio.current=null; stream.current?.getTracks?.().forEach(t=>t.stop()); stream.current=null; onLevel?.(0);
  };
  const startMeter=async()=>{
    try{if(!navigator.mediaDevices?.getUserMedia)return; stream.current=await navigator.mediaDevices.getUserMedia({audio:true}); const C=window.AudioContext||window.webkitAudioContext; if(!C)return;
      audio.current=new C(); const src=audio.current.createMediaStreamSource(stream.current); const analyser=audio.current.createAnalyser(); analyser.fftSize=1024; src.connect(analyser);
      const data=new Uint8Array(analyser.fftSize); meter.current.started=performance.now(); let last=performance.now(); let wasActive=false;
      const tick=()=>{
        const now=performance.now(); const dt=Math.max(0,now-last); last=now; analyser.getByteTimeDomainData(data); let sum=0,zc=0,prev=(data[0]-128)/128;
        for(let i=0;i<data.length;i++){const n=(data[i]-128)/128;sum+=n*n;if(i&&((prev<0&&n>=0)||(prev>=0&&n<0)))zc++;prev=n}
        const rms=Math.min(1,Math.sqrt(sum/data.length)*3.2); const active=rms>.055; meter.current.levels.push(rms);
        if(active)meter.current.active+=dt; else {meter.current.paused+=dt;if(wasActive)meter.current.pauses++;}
        if(active&&audio.current.sampleRate) { const hz=(zc*audio.current.sampleRate)/(2*data.length); if(hz>=70&&hz<=350)meter.current.pitch.push(hz); }
        wasActive=active; onLevel?.(rms); raf.current=requestAnimationFrame(tick);
      }; tick();
    }catch{onLevel?.(0)}
  };
  const start=async()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Browser speech recognition is unavailable. You can type instead.');return} const r=new SR(); recognition.current=r; r.continuous=false; r.interimResults=true; r.lang='en-US'; r.onresult=e=>onText?.(Array.from(e.results).map(x=>x[0].transcript).join(' ')); r.onerror=()=>{setOn(false);stopMeter()}; r.onend=()=>{setOn(false);stopMeter()}; try{r.start();setOn(true);await startMeter()}catch{setOn(false);stopMeter()}};
  const stop=()=>{recognition.current?.stop();setOn(false);stopMeter()};
  return <button className="icon-btn voice-btn" onClick={on?stop:start} aria-label={on?'Stop recording':'Speak'} title={on?'Stop recording':'Speak'}>{on?<MicOff/>:<Mic/>}</button>
}
