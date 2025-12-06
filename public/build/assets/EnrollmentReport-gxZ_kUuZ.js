import{r as o,j as t}from"./app-Ck4DA6Ax.js";import{E as se,a as le}from"./jspdf.plugin.autotable-Cgf24j1U.js";import{u as _,w as ae}from"./xlsx-CKN5doRT.js";import"./browser-DhcdjZmX.js";const f=l=>typeof l=="number"&&Number.isFinite(l)?l.toLocaleString():"0",M=l=>l.reduce((c,[,d])=>c+(Number(d)||0),0),re=()=>new Promise(l=>{const c=new Image;c.crossOrigin="anonymous",c.onload=()=>l(c),c.onerror=()=>l(null),c.src="/images/buksu_logo.png"});function ce({summary:l={},recent:c=[]}){var U,z;const[d,A]=o.useState("all"),[x,C]=o.useState("all"),[N,P]=o.useState(""),[u,Y]=o.useState("all"),[y,O]=o.useState("all"),w=o.useMemo(()=>["all",...Object.keys(l.by_status||{}).filter(e=>e!=null)],[l]),V=o.useMemo(()=>{var e;return["all",...((e=l.by_year)==null?void 0:e.map(s=>s.year_level).filter(Boolean))||[]]},[l]),q=o.useMemo(()=>{var e;return["all",...((e=l.by_program)==null?void 0:e.map(s=>s.program).filter(Boolean))||[]]},[l]);o.useMemo(()=>w.filter(e=>e!=="all").slice(0,4),[w]);const v=o.useMemo(()=>{const e=Object.entries(l.by_status||{});return d==="all"?e:e.filter(([s])=>s===d)},[l,d]),F=o.useMemo(()=>{const e=l.by_year||[];return x==="all"?e:e.filter(s=>s.year_level===x)},[l,x]),H=e=>{if(y==="all"||!e)return!0;const s=new Date(e);if(Number.isNaN(s.getTime()))return!0;const n=new Date,i={week:7,month:30,quarter:90}[y];if(!i)return!0;const g=new Date(n);return g.setDate(n.getDate()-i),s>=g&&s<=n},b=o.useMemo(()=>{const e=N.trim().toLowerCase();return c.filter(s=>{const n=d==="all"||(s.status||"").toLowerCase()===d.toLowerCase(),a=x==="all"||s.year_level===x,i=u==="all"||s.program===u,g=H(s.recorded_at),$=e===""||(s.student_name||"").toLowerCase().includes(e)||(s.student_id||"").toLowerCase().includes(e)||(s.program||"").toLowerCase().includes(e);return n&&a&&i&&g&&$})},[c,d,x,u,y,N]),R=o.useMemo(()=>d==="all"?l.total??M(v):M(v),[l,v,d]),j=o.useMemo(()=>b.map(e=>({Student:e.student_name||"Unnamed",ID:e.student_id||"—",Program:e.program||"—",Year:e.year_level||"—",Status:e.status||"—",Recorded:e.recorded_at||"—"})),[b]),L=o.useMemo(()=>l.by_status&&Object.entries(l.by_status).sort((e,s)=>(s[1]||0)-(e[1]||0))[0]||null,[l]),k=o.useMemo(()=>l.by_year&&[...l.by_year].sort((e,s)=>(s.total||0)-(e.total||0))[0]||null,[l]),D=o.useMemo(()=>M(Object.entries(l.by_status||{})),[l]),E=(e,s)=>s?Math.round((Number(e)||0)/s*100):0,J=()=>{A("all"),C("all"),Y("all"),O("all"),P("")},I=[{value:"all",label:"Any time"},{value:"week",label:"Last 7 days"},{value:"month",label:"Last 30 days"},{value:"quarter",label:"Last 90 days"}],S=`Status: ${d==="all"?"All":d} • Year: ${x==="all"?"All":x} • Program: ${u==="all"?"All":u} • Timeframe: ${((U=I.find(e=>e.value===y))==null?void 0:U.label)||"Any time"} • Search: ${N?`"${N}"`:"None"}`,B=l.program_breakdown||[],p=l.grand_totals||{},h=o.useMemo(()=>{const e=[];return B.forEach(s=>{(s.rows||[]).forEach(n=>{e.push({label:n.label,male:n.male??0,female:n.female??0,total:n.total??0})}),s.totals&&e.push({label:s.totals.label||`TOTAL ${s.course_code||"PROGRAM"}`,male:s.totals.male??0,female:s.totals.female??0,total:s.totals.total??0,isSubtotal:!0})}),e},[B]),r=o.useMemo(()=>{const e=l.meta||{};return{campus:e.campus||"ALUBIJID",semester:e.semester||"—",schoolYear:e.school_year||"—",preparedBy:e.prepared_by||"—",preparedRole:e.prepared_role||"Program Head",date:e.date||new Date().toLocaleDateString()}},[l.meta]),X=()=>{if(!h.length&&!j.length)return;(async()=>{var K;const s=new se({orientation:"portrait",unit:"mm",format:"letter"}),n=s.internal.pageSize.getWidth(),a=18;let i=16;const g=await re();g&&s.addImage(g,"PNG",a-6,i-6,18,18),s.setFont("Times","Bold"),s.setFontSize(12),s.text("BUKIDNON STATE UNIVERSITY",n/2,i,{align:"center"}),s.setFont("Times","Normal"),s.setFontSize(9),s.text("Malaybalay City, Bukidnon 8700",n/2,i+5,{align:"center"}),s.text("Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph",n/2,i+9,{align:"center"}),s.setFont("Times","Bold"),s.setFontSize(11),s.text("ENROLLMENT REPORT FOR SATELLITE CAMPUS",n/2,i+18,{align:"center"}),s.setFont("Times","Normal"),s.text(`CAMPUS: ${r.campus}    Semester: ${r.semester}    S.Y.: ${r.schoolYear}`,n/2,i+24,{align:"center"});const $=i+34,W=(h.length?h:j.map(m=>({label:m.Program,male:m.Male??"",female:m.Female??"",total:m.total??m.Total??""}))).map(m=>[m.label||"—",m.male??0,m.female??0,m.total??0]);h.length&&W.push(["TOTAL ENROLLMENT",p.male??0,p.female??0,p.overall??0]),le(s,{startY:$,head:[["COURSE/YEAR","MALE","FEMALE","TOTAL"]],body:W,styles:{fontSize:9,font:"Times",halign:"center",cellPadding:2},headStyles:{fontStyle:"bold",fillColor:[240,240,240],textColor:20},columnStyles:{0:{cellWidth:80,halign:"left"},1:{cellWidth:30},2:{cellWidth:30},3:{cellWidth:30}},bodyStyles:{textColor:30},alternateRowStyles:{fillColor:[252,252,252]}});const G=s.lastAutoTable.finalY+6;s.setFont("Times","Italic"),s.setFontSize(8),s.text("Add rows if necessary",a,G);const T=G+16;s.setFont("Times","Normal"),s.setFontSize(9),s.text("Prepared by:",a,T-6),s.setFont("Times","Bold"),s.text(r.preparedBy,a,T,{align:"left"}),s.setFont("Times","Normal"),s.text(r.preparedRole,a,T+4),s.setFontSize(7),s.text("(signature over printed name)",a,T+8);const ee=T+16;s.setFont("Times","Normal"),s.setFontSize(7),s.text(S,a,ee,{maxWidth:n-a*2});const te=((K=r.date)==null?void 0:K.replace(/\//g,"-"))||new Date().toLocaleDateString().replace(/\//g,"-");s.save(`Enrollment Report - ${te}.pdf`)})()},Q=()=>{if(!j.length)return;const e=[["BUKIDNON STATE UNIVERSITY"],["Malaybalay City, Bukidnon 8700"],["Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph"],["ENROLLMENT REPORT FOR SATELLITE CAMPUS"],[`CAMPUS: ${r.campus}    Semester: ${r.semester}    S.Y.: ${r.schoolYear}`],[S],["Generated",r.date||new Date().toLocaleString()],[]],s=_.aoa_to_sheet(e);_.sheet_add_json(s,j,{origin:e.length,skipHeader:!1});const n=_.book_new();_.book_append_sheet(n,s,"Enrollments");const a=(r.date||new Date().toLocaleDateString()).replace(/\//g,"-");ae(n,`Enrollment Report - ${a}.xlsx`)},Z=o.useCallback(()=>{if(typeof window>"u")return;const e=window.open("","_blank","width=1024,height=768");if(!e)return;const s=(h.length?h:[]).map(a=>`
        <tr>
          <td>${a.label||"—"}</td>
          <td class="text-center">${a.male??0}</td>
          <td class="text-center">${a.female??0}</td>
          <td class="text-center">${a.total??0}</td>
        </tr>`);h.length&&s.push(`
        <tr class="font-semibold">
          <td>TOTAL ENROLLMENT</td>
          <td class="text-center">${p.male??0}</td>
          <td class="text-center">${p.female??0}</td>
          <td class="text-center">${p.overall??0}</td>
        </tr>`);const n=b.map(a=>`
        <tr>
          <td>
            <div class="font-semibold">${a.student_name||"Unnamed"}</div>
            <div class="text-muted">ID: ${a.student_id||"—"}</div>
          </td>
          <td>${a.program||"—"}</td>
          <td class="text-center">${a.year_level||"—"}</td>
          <td class="text-center">${a.status||"—"}</td>
          <td class="text-right">${a.recorded_at||"—"}</td>
        </tr>`);e.document.write(`<!doctype html>
<html>
  <head>
    <title>Enrollment Report</title>
    <style>
      body { font-family: "Inter", "Poppins", sans-serif; color: #0f172a; margin: 24px; }
      h1 { font-size: 16px; margin: 0; }
      h2 { font-size: 14px; margin-bottom: 4px; }
      .meta { font-size: 11px; color: #475569; margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
      th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #475569; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-muted { font-size: 10px; color: #94a3b8; }
      .section { margin-top: 20px; }
    </style>
  </head>
  <body>
    <div style="text-align:center; margin-bottom: 12px;">
      <div class="meta">BUKIDNON STATE UNIVERSITY</div>
      <div class="meta">Malaybalay City, Bukidnon 8700</div>
      <div class="meta">Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph</div>
      <h1>ENROLLMENT REPORT FOR SATELLITE CAMPUS</h1>
      <div class="meta">CAMPUS: ${r.campus} • Semester: ${r.semester} • S.Y.: ${r.schoolYear}</div>
      <div class="meta">${S}</div>
      <div class="meta">Generated: ${r.date}</div>
    </div>

    <div class="section">
      <h2>Program Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Course / Year</th>
            <th class="text-center">Male</th>
            <th class="text-center">Female</th>
            <th class="text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          ${s.join(`
`)||'<tr><td colspan="4" class="text-center">No enrollment breakdown available.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Enrollment Activity</h2>
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Program</th>
            <th class="text-center">Year</th>
            <th class="text-center">Status</th>
            <th class="text-right">Recorded</th>
          </tr>
        </thead>
        <tbody>
          ${n.join(`
`)||'<tr><td colspan="5" class="text-center">No recent enrollment activity.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section" style="margin-top: 32px;">
      <div class="meta">Prepared by:</div>
      <div style="font-weight:600;">${r.preparedBy}</div>
      <div class="meta">${r.preparedRole}</div>
    </div>
  </body>
</html>`),e.document.close(),e.focus(),e.print(),e.close()},[h,p.male,p.female,p.overall,b,r.campus,r.semester,r.schoolYear,r.date,r.preparedBy,r.preparedRole,S]);return t.jsxs("div",{className:"space-y-4",children:[t.jsxs("header",{className:"flex flex-col gap-2 text-slate-700 sm:flex-row sm:items-center sm:justify-between",children:[t.jsxs("div",{className:"space-y-1",children:[t.jsx("h2",{className:"text-sm font-semibold text-slate-900",children:"Enrollment Overview"}),t.jsx("p",{className:"text-[11px] text-slate-500",children:"Totals aggregated across programs within your department."})]}),t.jsxs("div",{className:"flex items-center gap-1.5",children:[t.jsx("button",{type:"button",onClick:Z,className:"inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50",children:"Print"}),t.jsx("button",{type:"button",onClick:X,className:"inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100",disabled:!j.length,children:"Export PDF"}),t.jsx("button",{type:"button",onClick:Q,className:"inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-100",disabled:!j.length,children:"Export Excel"})]})]}),t.jsxs("section",{className:"grid gap-2 sm:grid-cols-3",children:[t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white px-3 py-3",children:[t.jsx("p",{className:"text-[10px] uppercase tracking-[0.18em] text-slate-400",children:"Total Enrollments"}),t.jsx("p",{className:"mt-1 text-lg font-semibold text-slate-900",children:f(R)})]}),t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white px-3 py-3",children:[t.jsx("p",{className:"text-[10px] uppercase tracking-[0.18em] text-slate-400",children:"Active Programs"}),t.jsx("p",{className:"mt-1 text-lg font-semibold text-slate-900",children:f(l.programs)})]}),t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white px-3 py-3",children:[t.jsx("p",{className:"text-[10px] uppercase tracking-[0.18em] text-slate-400",children:"Year Levels"}),t.jsx("p",{className:"mt-1 text-lg font-semibold text-slate-900",children:f(F.length||((z=l.by_year)==null?void 0:z.length)||0)})]})]}),t.jsx("section",{className:"rounded-lg border border-slate-200 bg-white p-3",children:t.jsxs("div",{className:"flex flex-col gap-3",children:[t.jsxs("div",{className:"flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",children:[t.jsx("h3",{className:"text-[11px] font-semibold text-slate-700",children:"Filters"}),t.jsxs("p",{className:"text-[11px] text-slate-500",children:[b.length," results · ",S]})]}),t.jsxs("div",{className:"flex flex-wrap items-center gap-1.5",children:[t.jsx("input",{type:"text",value:N,onChange:e=>P(e.target.value),placeholder:"Search by name, ID, or program",className:"w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none focus:ring focus:ring-sky-100 sm:w-56"}),t.jsx("select",{value:d,onChange:e=>A(e.target.value),className:"rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none",children:w.map(e=>t.jsx("option",{value:e,children:e==="all"?"All Status":e},e))}),t.jsx("select",{value:x,onChange:e=>C(e.target.value),className:"rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none",children:V.map(e=>t.jsx("option",{value:e,children:e==="all"?"All Years":e},e))}),t.jsx("select",{value:u,onChange:e=>Y(e.target.value),className:"rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none",children:q.map(e=>t.jsx("option",{value:e,children:e==="all"?"All Programs":e},e))}),t.jsx("select",{value:y,onChange:e=>O(e.target.value),className:"rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 focus:border-sky-300 focus:outline-none",children:I.map(e=>t.jsx("option",{value:e.value,children:e.label},e.value))}),t.jsx("button",{type:"button",onClick:J,className:"rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 transition hover:bg-slate-50",disabled:d==="all"&&x==="all"&&u==="all"&&y==="all"&&!N,children:"Reset"})]})]})}),t.jsxs("section",{className:"grid gap-3 lg:grid-cols-3",children:[t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white p-3",children:[t.jsx("h3",{className:"text-[11px] font-semibold text-slate-700",children:"By Status"}),t.jsx("div",{className:"mt-2 space-y-2",children:v.length>0?v.map(([e,s])=>t.jsxs("div",{className:"space-y-1 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("span",{className:"capitalize",children:e||"Unspecified"}),t.jsx("span",{className:"font-semibold text-slate-800",children:f(s)})]}),t.jsx("div",{className:"h-1.5 w-full rounded-full bg-slate-200",children:t.jsx("div",{className:"h-full rounded-full bg-sky-400 transition-all",style:{width:`${E(s,D)}%`}})}),t.jsxs("p",{className:"text-[10px] text-slate-400",children:[E(s,D),"% of total"]})]},e||"unspecified")):t.jsx("p",{className:"text-[11px] text-slate-400",children:"No status data."})})]}),t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white p-3",children:[t.jsx("h3",{className:"text-[11px] font-semibold text-slate-700",children:"By Year Level"}),t.jsx("div",{className:"mt-2 space-y-2",children:F.length>0?F.map(e=>t.jsxs("div",{className:"space-y-1 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] text-slate-600",children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("span",{children:e.year_level||"Unassigned"}),t.jsx("span",{className:"font-semibold text-slate-800",children:f(e.total)})]}),t.jsx("div",{className:"h-1.5 w-full rounded-full bg-slate-200",children:t.jsx("div",{className:"h-full rounded-full bg-emerald-400 transition-all",style:{width:`${E(e.total,R||l.total)}%`}})}),t.jsxs("p",{className:"text-[10px] text-slate-400",children:[E(e.total,R||l.total),"% share"]})]},e.year_level)):t.jsx("p",{className:"text-[11px] text-slate-400",children:"No year-level data."})})]}),t.jsxs("div",{className:"rounded-lg border border-slate-200 bg-white p-3",children:[t.jsx("h3",{className:"text-[11px] font-semibold text-slate-700",children:"Insights"}),t.jsxs("div",{className:"mt-2 space-y-3 text-[12px] text-slate-600",children:[t.jsxs("div",{className:"rounded border border-slate-100 bg-slate-50 p-3",children:[t.jsx("p",{className:"text-[10px] uppercase tracking-[0.2em] text-slate-400",children:"Top Status"}),L?t.jsxs(t.Fragment,{children:[t.jsx("p",{className:"text-sm font-semibold text-slate-900 capitalize",children:L[0]}),t.jsxs("p",{className:"text-[11px] text-slate-500",children:[f(L[1])," students"]})]}):t.jsx("p",{className:"text-[11px] text-slate-400",children:"No status data."})]}),t.jsxs("div",{className:"rounded border border-slate-100 bg-slate-50 p-3",children:[t.jsx("p",{className:"text-[10px] uppercase tracking-[0.2em] text-slate-400",children:"Busiest Year Level"}),k?t.jsxs(t.Fragment,{children:[t.jsx("p",{className:"text-sm font-semibold text-slate-900",children:k.year_level||"Unassigned"}),t.jsxs("p",{className:"text-[11px] text-slate-500",children:[f(k.total)," enrollments"]})]}):t.jsx("p",{className:"text-[11px] text-slate-400",children:"No year data."})]})]})]})]}),t.jsxs("section",{className:"rounded-lg border border-slate-200 bg-white p-3",children:[t.jsx("h3",{className:"text-[11px] font-semibold text-slate-700",children:"Recent Enrollment Activity"}),t.jsx("div",{className:"mt-2 overflow-x-auto",children:t.jsxs("table",{className:"w-full min-w-[520px] border-collapse text-[12px] text-slate-600",children:[t.jsx("thead",{className:"bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-500",children:t.jsxs("tr",{children:[t.jsx("th",{className:"px-3 py-1.5 text-left",children:"Student"}),t.jsx("th",{className:"px-3 py-1.5 text-left",children:"Program"}),t.jsx("th",{className:"px-3 py-1.5 text-left",children:"Year"}),t.jsx("th",{className:"px-3 py-1.5 text-left",children:"Status"}),t.jsx("th",{className:"px-3 py-1.5 text-right",children:"Recorded"})]})}),t.jsx("tbody",{children:b.length>0?b.map(e=>t.jsxs("tr",{className:"border-t border-slate-100 hover:bg-slate-50",children:[t.jsxs("td",{className:"px-3 py-1.5 font-medium text-slate-800",children:[t.jsx("div",{children:e.student_name||"Unnamed"}),t.jsxs("div",{className:"text-[10px] text-slate-400",children:["ID: ",e.student_id||"—"]})]}),t.jsx("td",{className:"px-3 py-1.5",children:e.program||"—"}),t.jsx("td",{className:"px-3 py-1.5",children:e.year_level||"—"}),t.jsx("td",{className:"px-3 py-1.5 capitalize",children:e.status||"—"}),t.jsx("td",{className:"px-3 py-1.5 text-right text-[11px] text-slate-500",children:e.recorded_at||"—"})]},e.id)):t.jsx("tr",{children:t.jsx("td",{colSpan:5,className:"px-3 py-6 text-center text-[12px] text-slate-400",children:"No recent enrollment activity."})})})]})})]})]})}export{ce as default};
