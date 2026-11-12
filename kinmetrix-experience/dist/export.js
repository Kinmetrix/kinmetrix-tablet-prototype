/* Export presentation settings never alter the recorded measurements. */
const exportForceUnits={
 kg:{label:'kg',factor:1,area:'kgf·s',spoken:'kilogram-force'},
 lb:{label:'lb',factor:2.20462262185,area:'lbf·s',spoken:'pound-force'},
 n:{label:'N',factor:9.80665,area:'N·s',spoken:'newtons'}
};
function reportExportSettings(){return state.exportSettings??=( {unit:'kg',orientation:'down',method:'pdf'} );}
function exportForce(value,unit='kg',digits=1){return (value*exportForceUnits[unit].factor).toFixed(digits);}
function exportOrientationLabel(orientation){return orientation==='up'?'Looking up · 0° at bottom':'Looking down · 0° at top';}
function exportOrientationPreview(orientation){const up=orientation==='up';return `<svg class="export-orientation-preview" viewBox="0 0 80 94" role="img" aria-label="${exportOrientationLabel(orientation)}"><text x="40" y="${up?89:12}" text-anchor="middle">0°</text><g transform="rotate(${up?180:0} 40 47)">${personOrientation(40,47,.65)}</g></svg>`;}
function openReportExport(){if(!state.result)return;const settings=reportExportSettings();if(state.result.partial)settings.method='pdf';openModal('report-export');}
function reportExportDialog(){
 const r=state.result,s=reportExportSettings(),csv=s.method==='csv';
 return `<div class="modal-backdrop"><section class="dialog export-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="export-context"><header class="dialog-header"><h2 id="dialog-title">Export report</h2><button class="icon-button" data-action="close-modal" aria-label="Close export">${icon('close')}</button></header>
 <p id="export-context">${escapeHTML(person().name)} · ${protocols[r.type].name} · ${escapeHTML(sessionStamp(r))}</p>
 <fieldset class="export-setting"><legend>Force unit</legend><div class="export-segmented">${Object.entries(exportForceUnits).map(([key,unit])=>`<label><input type="radio" id="export-unit-${key}" name="export-unit" value="${key}" ${s.unit===key?'checked':''}><span>${unit.label}</span></label>`).join('')}</div></fieldset>
 <div class="export-orientation"><fieldset class="export-setting" ${csv?'disabled':''}><legend>Chart orientation</legend><div class="export-segmented">${[['down','Looking down'],['up','Looking up']].map(([key,label])=>`<label><input type="radio" id="export-orientation-${key}" name="export-orientation" value="${key}" ${s.orientation===key?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="export-setting-help">${csv?'CSV contains angles; orientation applies to PDF.':exportOrientationLabel(s.orientation)}</p></fieldset>${exportOrientationPreview(s.orientation)}</div>
 <fieldset class="export-setting export-methods"><legend>Format</legend>${[['pdf','PDF / Print','Print or save a PDF from this device.','print'],['csv','CSV','Download the measurements.','download'],['email','Email','Email delivery is not connected in this prototype.','mail']].map(([key,label,description,glyph])=>`<label class="export-method ${s.method===key?'selected':''} ${key==='email'||(key==='csv'&&r.partial)?'unavailable':''}"><input type="radio" id="export-method-${key}" name="export-method" value="${key}" ${s.method===key?'checked':''} ${key==='email'||(key==='csv'&&r.partial)?'disabled':''}>${icon(glyph)}<span><strong>${label}</strong><small>${key==='csv'&&r.partial?'Available after a complete session.':description}</small></span></label>`).join('')}</fieldset>
 <footer class="export-footer"><button class="button" data-action="close-modal">Cancel</button><button class="button primary" data-action="confirm-report-export">${csv?'Download CSV':'Print / Save PDF'}</button></footer></section></div>`;
}
function confirmReportExport(){const s=reportExportSettings();if(s.method==='csv'){downloadReportCSV();closeModal();}else if(s.method==='pdf'){renderReportPrintContent();window.print();}}
function renderReportPrintContent(){
 const r=state.result;
 document.querySelectorAll('.report-print-only').forEach(el=>el.remove());
 $('#app').insertAdjacentHTML('beforeend',reportPrintView(r));
 const ui=reportState();if(ui.page==='reps'){const d=reportData(r).directions[ui.direction];$('#app').insertAdjacentHTML('beforeend',repPrintDetail(r,d,repViewerState(r,d)));}
}
const exportActions={'confirm-report-export':confirmReportExport};
document.addEventListener('change',event=>{
 const el=event.target,key={'export-unit':'unit','export-orientation':'orientation','export-method':'method'}[el.name];
 if(!key||state.overlay?.type!=='report-export')return;
 const allowed={unit:['kg','lb','n'],orientation:['up','down'],method:['pdf','csv']};if(!allowed[key].includes(el.value))return;
 reportExportSettings()[key]=el.value;renderOverlay();$('#'+el.id)?.focus({preventScroll:true});
});
window.addEventListener('beforeprint',()=>{if(state.stage==='review'&&state.result)renderReportPrintContent();});
