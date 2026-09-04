import {Line,Doughnut,Radar,Bar} from 'react-chartjs-2';import {Chart as ChartJS,CategoryScale,LinearScale,PointElement,LineElement,ArcElement,RadialLinearScale,BarElement,Tooltip,Legend,Filler} from 'chart.js';
ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,ArcElement,RadialLinearScale,BarElement,Tooltip,Legend,Filler);
const css=(name,fallback)=>typeof window!=='undefined'?(getComputedStyle(document.documentElement).getPropertyValue(name).trim()||fallback):fallback; const axis=()=>({ticks:{color:css('--chart-text','#8f99aa')},grid:{color:css('--chart-grid','rgba(120,140,170,.12)')}});
export function TrendChart({series=[],lines}){
  const ds=lines||[
    {label:'Overall',data:series.map(x=>x.overall)}
  ];

  const palette=[
    {border:'#7dffe0',background:'rgba(125,255,224,.18)'},
    {border:'#8b7cff',background:'rgba(139,124,255,.18)'},
    {border:'#ff6fb5',background:'rgba(255,111,181,.18)'}
  ];

  const rows=ds.flatMap((d,di)=>
    (d.data||[]).map((x,i)=>{
      const timestamp=Date.parse(x.date);
      return {
        timestamp,
        label:x.label||x.date||`Assessment ${i+1}`,
        type:di,
        index:i,
        value:Number(x.overall)
      };
    })
  ).filter(x=>Number.isFinite(x.timestamp)&&Number.isFinite(x.value))
   .sort((a,b)=>a.timestamp-b.timestamp||a.type-b.type||a.index-b.index);

  const formatTime=timestamp=>{
    if(!Number.isFinite(timestamp))return '';
    const d=new Date(timestamp);
    return d.toLocaleString([],{
      day:'2-digit',
      month:'short',
      hour:'2-digit',
      minute:'2-digit'
    });
  };

  return <Line
    data={{
      datasets:ds.map((d,di)=>({
        label:d.label,
        data:rows
          .filter(r=>r.type===di)
          .map(r=>({x:r.timestamp,y:r.value})),
        tension:.32,
        spanGaps:false,
        pointRadius:6,
        pointHoverRadius:9,
        pointBorderWidth:2,
        pointBackgroundColor:palette[di%palette.length].border,
        pointBorderColor:'#0f1726',
        borderColor:palette[di%palette.length].border,
        backgroundColor:palette[di%palette.length].background,
        borderWidth:3,
        fill:false
      }))
    }}
    options={{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'nearest',intersect:false},
      plugins:{
        legend:{
          display:true,
          position:'top',
          labels:{
            color:css('--chart-legend','#dbe4f5'),
            usePointStyle:true,
            pointStyle:'circle',
            padding:18,
            font:{size:13,weight:'600'}
          }
        },
        tooltip:{
          backgroundColor:'#111a2b',
          titleColor:'#ffffff',
          bodyColor:'#dbe4f5',
          borderColor:'rgba(125,255,224,.35)',
          borderWidth:1,
          padding:12,
          callbacks:{
            title:items=>formatTime(items[0]?.parsed?.x),
            label:item=>`${item.dataset.label}: ${item.parsed.y}/100`
          }
        }
      },
      scales:{
        y:{
          min:0,
          max:100,
          ...axis(),
          ticks:{
            ...axis().ticks,
            stepSize:10,
            padding:8
          },
          grid:{
            color:'rgba(150,170,200,.13)',
            drawBorder:false
          },
          title:{
            display:true,
            text:'Score (0?100)',
            color:'#9eabc0',
            font:{size:12,weight:'600'}
          }
        },
        x:{
          type:'linear',
          ...axis(),
          grid:{
            color:'rgba(150,170,200,.08)',
            drawBorder:false
          },
          title:{
            display:true,
            text:'Assessment time',
            color:'#9eabc0',
            font:{size:12,weight:'600'}
          },
          ticks:{
            ...axis().ticks,
            color:'#aebbd0',
            maxRotation:35,
            minRotation:0,
            maxTicksLimit:7,
            callback:value=>formatTime(Number(value))
          }
        }
      }
    }}
  />
}

export function SkillRadar({skills={}}){
  const entries=Object.entries(skills)
    .filter(([,v])=>Number.isFinite(Number(v)));

  if(!entries.length)
    return <div className="chart-empty">Complete an assessment to build your Skill DNA.</div>;

  return <Radar
    data={{
      labels:entries.map(([k])=>k),
      datasets:[{
        label:'Skill DNA',
        data:entries.map(([,v])=>Number(v)),
        fill:true,
        backgroundColor:'rgba(139,124,255,.22)',
        borderColor:'#8b7cff',
        borderWidth:3,
        pointRadius:5,
        pointHoverRadius:7,
        pointBackgroundColor:'#7dffe0',
        pointBorderColor:'#0f1726',
        pointBorderWidth:2
      }]
    }}
    options={{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{
          display:true,
          labels:{
            color:css('--chart-legend','#dbe4f5'),
            usePointStyle:true,
            pointStyle:'circle'
          }
        }
      },
      scales:{
        r:{
          min:0,
          max:100,
          angleLines:{color:'rgba(150,170,200,.18)'},
          grid:{color:'rgba(150,170,200,.18)'},
          pointLabels:{
            color:css('--chart-text','#cbd5e5'),
            font:{size:11,weight:'600'}
          },
          ticks:{
            color:css('--chart-text','#9eabc0'),
            backdropColor:'transparent',
            stepSize:20
          }
        }
      }
    }}
  />
}

export function FallacyChart({data={}}){
  const entries=Object.entries(data||{})
    .filter(([,v])=>Number.isFinite(Number(v)));

  if(!entries.length)
    return <div className="chart-empty">No fallacy types have been logged from your actual analyses.</div>;

  return <Bar
    data={{
      labels:entries.map(([k])=>k),
      datasets:[{
        label:'Occurrences',
        data:entries.map(([,v])=>Number(v)),
        backgroundColor:'rgba(255,111,181,.65)',
        borderColor:'#ff6fb5',
        borderWidth:2,
        borderRadius:8,
        maxBarThickness:58
      }]
    }}
    options={{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'#111a2b',
          titleColor:'#ffffff',
          bodyColor:'#dbe4f5',
          callbacks:{
            label:item=>`Occurrences: ${item.parsed.y}`
          }
        }
      },
      scales:{
        y:{
          beginAtZero:true,
          precision:0,
          ...axis(),
          ticks:{
            ...axis().ticks,
            stepSize:1
          },
          grid:{
            color:'rgba(150,170,200,.13)',
            drawBorder:false
          },
          title:{
            display:true,
            text:'Occurrences',
            color:'#9eabc0'
          }
        },
        x:{
          ...axis(),
          grid:{
            color:'rgba(150,170,200,.08)',
            drawBorder:false
          },
          ticks:{
            ...axis().ticks,
            color:'#aebbd0'
          }
        }
      }
    }}
  />
}

export function Ring({value=0}){
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  const degrees=`${safe*3.6}deg`;
  return <div className="ring-visual" style={{'--score-angle':degrees}}>
    <div className="ring-visual-inner">
      <strong>{Math.round(safe)}</strong>
      <span>/100</span>
    </div>
  </div>
}
