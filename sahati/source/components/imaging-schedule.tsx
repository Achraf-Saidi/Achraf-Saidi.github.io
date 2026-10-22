'use client';
import {uiText as tr} from '@/lib/i18n';
import {useState} from 'react';
import type {Entity} from '@/lib/model';
import {today} from '@/lib/model';
import {Icon} from './sahati-ui';
export default function ImagingSchedule({record,role,save,busy}:{record:Entity;role:string;save:(v:any)=>void;busy:boolean}){
 const [date,setDate]=useState(today()),[time,setTime]=useState('14:00'),[modality,setModality]=useState('Équipement démo 01');
 if(record.imagingDate)return <div className="sample-identity"><Icon name="CalendarDays"/><strong>{record.imagingDate} · {record.imagingTime}</strong><span>{record.modality} · {record.imagingDuration}{tr("min")}</span></div>;
 if(role!=='radiology'||record.status!=='requested')return null;
 return <section className="detail-section"><h3>{tr("Programmer l’examen")}</h3><div className="form-grid"><label>{tr("Date")}<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>{tr("Heure")}<input type="time" step={300} value={time} onChange={e=>setTime(e.target.value)}/></label><label>{tr("Équipement synthétique")}<select value={modality} onChange={e=>setModality(e.target.value)}><option value="Équipement démo 01">{tr("Équipement démo 01")}</option><option value="Équipement démo 02">{tr("Équipement démo 02")}</option></select></label></div><button className="button button-dark" disabled={busy} onClick={()=>save({action:'schedule-imaging',date,time,modality,duration:20})}><Icon name="CalendarDays" size={17}/>{tr("Réserver 20 minutes")}</button><p className="help-text">{tr("Les conflits d’équipement sont vérifiés. Aucun appareil réel n’est connecté.")}</p></section>;
}
