/* Dependency-free descriptive replication analysis. Clinical efficacy is not inferred. */
(function(root){
  'use strict';
  function bh(p){
    if(!p.every(x=>Number.isFinite(x)&&x>=0&&x<=1)) throw Error('P-values invalides.');
    const sorted=p.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v), out=Array(p.length);let next=1;
    for(let j=p.length-1;j>=0;j--){next=Math.min(next,sorted[j].v*p.length/(j+1));out[sorted[j].i]=next;}return out;
  }
  function csv(text){
    const rows=[];let row=[],field='',quoted=false;const s=text.replace(/^\uFEFF/,'');
    for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){field+='"';i++;}else if(!quoted&&field===''){quoted=true;}else if(quoted){quoted=false;}else throw Error('CSV : guillemet inattendu.');}
    else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}else field+=c;}
    if(quoted)throw Error('CSV : guillemet non fermé.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);
    if(rows.length<2)throw Error('Le CSV doit contenir un en-tête et des données.');const header=rows.shift().map(v=>v.trim());if(new Set(header).size!==header.length)throw Error('En-têtes dupliqués.');
    return rows.map((r,i)=>{if(r.length!==header.length)throw Error(`Ligne ${i+2} : nombre de colonnes incorrect.`);return Object.fromEntries(header.map((h,j)=>[h,r[j].trim()]));});
  }
  const required=['gene','study','cohort','cell_type','effect','se','p_value','n_case','n_control','effect_scale','contrast'];
  function validate(rows){
    if(!rows.length||rows.length>50000)throw Error('Importer entre 1 et 50 000 lignes.');const seen=new Set();
    return rows.map((raw,i)=>{const r={...raw};for(const key of required)if(r[key]===undefined||String(r[key]).trim()==='')throw Error(`Ligne ${i+2} : ${key} absent.`);
      for(const k of ['effect','se','p_value','n_case','n_control']){r[k]=Number(r[k]);if(!Number.isFinite(r[k]))throw Error(`Ligne ${i+2} : ${k} non numérique.`);}
      if(r.se<=0||r.p_value<0||r.p_value>1||r.n_case<3||r.n_control<3||!Number.isInteger(r.n_case)||!Number.isInteger(r.n_control))throw Error(`Ligne ${i+2} : SE, p-value ou effectif invalide (minimum 3 donneuses par groupe).`);
      const key=JSON.stringify([r.gene,r.study,r.cell_type,r.contrast]);if(seen.has(key))throw Error(`Ligne ${i+2} : gène/étude/cellule/contraste dupliqué.`);seen.add(key);return r;});
  }
  function normalTail(z){ // Abramowitz-Stegun; normal approximation only.
    const x=Math.abs(z),t=1/(1+.2316419*x),d=.3989422804014327*Math.exp(-x*x/2);
    return Math.max(0,Math.min(1,2*d*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))))));
  }
  function pooled(rows){
    const w=rows.map(r=>1/(r.se*r.se)),sw=w.reduce((a,b)=>a+b,0),mu=rows.reduce((a,r,i)=>a+w[i]*r.effect,0)/sw;
    const se=Math.sqrt(1/sw),Q=rows.reduce((a,r,i)=>a+w[i]*(r.effect-mu)**2,0),I2=Q>0?Math.max(0,(Q-(rows.length-1))/Q):0;
    return {effect:mu,se,low:mu-1.96*se,high:mu+1.96*se,p:normalTail(mu/se),Q,I2};
  }
  function analyze(input,{minStudies=2,maxI2=.5,alpha=.05,minEffect=0}={}){
    const rows=validate(input),families=new Map();
    for(const r of rows){const k=JSON.stringify([r.study,r.cell_type,r.contrast]);if(!families.has(k))families.set(k,[]);families.get(k).push(r);}
    for(const family of families.values()){const q=bh(family.map(r=>r.p_value));family.forEach((r,i)=>r.q=q[i]);}
    const groups=new Map();for(const r of rows){const k=JSON.stringify([r.gene,r.cell_type,r.effect_scale,r.contrast]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
    const output=[...groups.values()].map(rs=>{
      // A shared cohort label is a hard stop. Labels alone cannot prove independence.
      const overlap=new Set(rs.map(r=>r.cohort)).size!==rs.length;const m=pooled(rs),signs=rs.map(r=>Math.sign(r.effect));
      const concordant=signs.every(s=>s===signs[0])&&signs[0]!==0;
      const loo=rs.length>=3?rs.map((_,i)=>pooled(rs.filter((_,j)=>i!==j))):[];
      const looStable=loo.length>0&&loo.every(x=>Math.sign(x.effect)===Math.sign(m.effect)&&x.low*x.high>0);
      const significant=rs.filter(r=>r.q<=alpha).length;
      const reasons=[];if(rs.length<minStudies)reasons.push('Réplication insuffisante');if(overlap)reasons.push('Cohortes partagées');if(!concordant)reasons.push('Sens discordant');if(m.I2>maxI2)reasons.push('Hétérogénéité élevée');if(significant<minStudies)reasons.push('FDR par étude insuffisante');if(Math.abs(m.effect)<minEffect)reasons.push('Effet sous le seuil');
      return {gene:rs[0].gene,cell_type:rs[0].cell_type,effect_scale:rs[0].effect_scale,contrast:rs[0].contrast,studies:rs.length,cohorts:rs.map(r=>r.cohort),rows:rs,...m,concordant,significant,overlap,loo,looStable,reasons};
    });
    // Meta-family corrected separately for every cell/scale/contrast across ALL imported genes.
    const metaFamilies=new Map();for(const r of output){const k=JSON.stringify([r.cell_type,r.effect_scale,r.contrast]);if(!metaFamilies.has(k))metaFamilies.set(k,[]);metaFamilies.get(k).push(r);}
    for(const group of metaFamilies.values()){const q=bh(group.map(r=>r.p));group.forEach((r,i)=>{r.q_meta=q[i];if(r.q_meta>alpha)r.reasons.push('FDR combinée insuffisante');r.eligible=r.reasons.length===0;});}
    return output.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.significant-a.significant||a.I2-b.I2||a.q_meta-b.q_meta||a.gene.localeCompare(b.gene));
  }
  function demo(){const result=[];const genes=Array.from({length:12},(_,i)=>`DEMO_${String(i+1).padStart(2,'0')}`);
    genes.forEach((gene,i)=>['SYN_A','SYN_B','SYN_C'].forEach((study,j)=>{const effect=i===0?.8+j*.04:i===1?(j===2?-.7:.8):i===2?.15+j*.6:i===3?-.65-j*.02:Math.sin(i*2+j)*.09;const se=i<4?.12:.22;
      result.push({gene,study,cohort:study,cell_type:'synthetic_stroma',effect,se,p_value:normalTail(effect/se),n_case:12,n_control:12,effect_scale:'log2_CPM_difference',contrast:'case_minus_control'});}));return result;
  }
  function toCSV(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]);const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n');}
  const api={bh,csv,validate,normalTail,pooled,analyze,demo,toCSV,required};if(typeof module!=='undefined')module.exports=api;root.EndoStats=api;
})(typeof globalThis!=='undefined'?globalThis:this);
