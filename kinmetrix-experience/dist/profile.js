/* Member details are synthetic, in-memory data, separate from assessed movement limits. */
const profileExampleDetails={alex:{heightCm:178,bodyWeightKg:78.4,handedness:'right',activityLevel:'moderate',primaryActivity:'Hiking and strength training',goals:'Build strength and return to regular training.'}};
const handednessOptions=[['','Not recorded'],['right','Right-handed'],['left','Left-handed'],['both','Both / ambidextrous']];
const activityOptions=[['','Not recorded'],['low','Low · mostly seated'],['light','Light · occasional activity'],['moderate','Moderate · regular activity'],['high','High · frequent training']];
const profileFieldNames=['heightCm','bodyWeightKg','handedness','activityLevel','primaryActivity','goals'];
function memberDetails(){return state.memberDetails[state.personId]||profileExampleDetails[state.personId]||{heightCm:null,bodyWeightKg:null,handedness:'',activityLevel:'',primaryActivity:'',goals:''};}
function canEditMemberDetails(){return state.actor==='coach'&&!state.guided&&visiblePeople().some(p=>p.id===state.personId);}
function profileDraftKey(){return `${state.clinicianId}:${state.personId}`;}
function activeProfileDraft(){return canEditMemberDetails()?state.profileDrafts[profileDraftKey()]:null;}
function profileValue(value,unit=''){return value===null||value===undefined||value===''?'<span class="profile-unrecorded">Not recorded</span>':`${escapeHTML(value)}${unit?` <small>${unit}</small>`:''}`;}
function profileOptionLabel(options,value){return options.find(option=>option[0]===value)?.[1]||'Not recorded';}
function profileSelect(id,label,field,options,value){return `<div class="profile-edit-field"><label for="${id}">${label}</label><select id="${id}" data-profile-field="${field}">${options.map(([key,text])=>`<option value="${key}" ${key===value?'selected':''}>${text}</option>`).join('')}</select></div>`;}
function profileDetailsReadView(d){return `<dl class="profile-detail-grid">
 <div><dt>Height</dt><dd>${profileValue(d.heightCm,'cm')}</dd></div>
 <div><dt>Body weight</dt><dd>${profileValue(d.bodyWeightKg,'kg')}</dd></div>
 <div><dt>Handedness</dt><dd class="profile-text-value">${d.handedness?escapeHTML(profileOptionLabel(handednessOptions,d.handedness)):profileValue(null)}</dd></div>
 <div><dt>Activity level</dt><dd class="profile-text-value">${d.activityLevel?escapeHTML(profileOptionLabel(activityOptions,d.activityLevel).split(' · ')[0]):profileValue(null)}</dd>${d.activityLevel?`<p>${escapeHTML(profileOptionLabel(activityOptions,d.activityLevel).split(' · ')[1])}</p>`:''}</div>
 </dl><dl class="profile-context-fields"><div><dt>Primary activity / sport</dt><dd>${profileValue(d.primaryActivity)}</dd></div><div><dt>Goals</dt><dd>${profileValue(d.goals)}</dd></div></dl>`;}
function profileDetailsEditView(d){return `<form id="member-details-form" class="profile-edit-form" novalidate>
 ${photoCaptureControl('profile',d)}
 <div class="profile-edit-grid"><div class="profile-edit-field"><label for="profile-height">Height <span>cm</span></label><input id="profile-height" data-profile-field="heightCm" type="number" inputmode="decimal" min="0.1" step="0.1" value="${escapeHTML(d.heightCm??'')}" placeholder="Not recorded"></div>
 <div class="profile-edit-field"><label for="profile-weight">Body weight <span>kg</span></label><input id="profile-weight" data-profile-field="bodyWeightKg" type="number" inputmode="decimal" min="0.1" step="0.1" value="${escapeHTML(d.bodyWeightKg??'')}" placeholder="Not recorded"></div>
 ${profileSelect('profile-handedness','Handedness','handedness',handednessOptions,d.handedness)}
 ${profileSelect('profile-activity','Activity level','activityLevel',activityOptions,d.activityLevel)}</div>
 <div class="profile-edit-field"><label for="profile-primary-activity">Primary activity / sport</label><input id="profile-primary-activity" data-profile-field="primaryActivity" type="text" maxlength="120" value="${escapeHTML(d.primaryActivity)}" placeholder="For example, walking or swimming"></div>
 <div class="profile-edit-field"><label for="profile-goals">Goals</label><textarea id="profile-goals" data-profile-field="goals" rows="2" maxlength="500" placeholder="What would they like to work toward?">${escapeHTML(d.goals)}</textarea></div>
 <p class="profile-edit-help">All fields are optional. Changes are saved only when you choose Save.</p>
 </form>`;}
function memberProfileView(){const p=person(),pr=profile(),d=memberDetails(),draft=activeProfileDraft();return `${pr.pending&&state.actor==='coach'?`<div class="notice"><span>New range measurements are awaiting your review.</span>${button('Review','review-pending','small-button')}</div>`:''}
 <div class="member-profile-layout"><section class="member-details-panel"><div class="profile-details-heading"><h2>${draft?'Edit member details':'Member details'}</h2><div class="button-row">${draft?`${button('Cancel','cancel-profile-edit','small-button')}<button type="submit" form="member-details-form" class="button primary small-button">Save</button>`:canEditMemberDetails()?button('Edit','edit-member-details','small-button','aria-label="Edit member details"'):''}</div></div>
 ${draft?profileDetailsEditView(draft):profileDetailsReadView(d)}
 <div class="profile-care-context"><div><span>Assigned clinician</span><strong>${escapeHTML(clinicians.find(c=>c.id===p.assigned).name)}</strong></div><div><span>Clinic</span><strong>Northside clinic</strong></div></div>
 <p class="profile-update-note">${draft?'Unsaved changes stay here if you switch tabs.':d.updatedAt?`Updated ${new Date(d.updatedAt).toLocaleDateString('en-CA',{day:'numeric',month:'short',timeZone:'America/Toronto'})} by ${escapeHTML(d.updatedBy)}`:profileExampleDetails[p.id]?'Example member details':'Add details as they become available.'}${state.actor==='member'?' · Ask your clinician to update these details.':''}</p>
 </section><section class="profile-range-panel"><div class="section-title"><h2>Personal working range</h2><span class="badge neutral">${hasWorkingRange()?'Coach applied':'Not set'}</span></div>
 ${pr.assessedLimits?modeWorkingProfile():`${directionMap({count:8,mini:true,percent:hasWorkingRange()?pr.percent:0})}<div class="profile-percent"><strong>${hasWorkingRange()?pr.percent+'%':'Not set'}</strong><span>${hasWorkingRange()?'of assessed range':'Assessment needed'}</span></div>`}
 <div class="profile-range-details"><strong>${hasWorkingRange()?'Applied by '+escapeHTML(pr.reviewer):'Start with a range assessment'}</strong>${hasWorkingRange()?'Source: range assessment · '+pr.date:'A coach reviews measured limits before applying working settings.'}</div>
 ${state.actor==='coach'?button('Reassess range','start-rom','small-button'):''}</section></div>`;}
function saveMemberDetails(){
 if(!canEditMemberDetails()||!activeProfileDraft()||activeProfileDraft().photoLoading)return;
 const form=$('#member-details-form');if(!form?.reportValidity())return;
 const draft=activeProfileDraft(),next={};
 for(const field of profileFieldNames){const value=draft[field];next[field]=['heightCm','bodyWeightKg'].includes(field)?value===''||value===null?null:Number(value):String(value||'').trim();}
 if(['heightCm','bodyWeightKg'].some(key=>next[key]!==null&&(!Number.isFinite(next[key])||next[key]<=0)))return;
 if(!handednessOptions.some(([key])=>key===next.handedness)||!activityOptions.some(([key])=>key===next.activityLevel))return;
 state.memberDetails[state.personId]={...next,updatedAt:new Date().toISOString(),updatedBy:clinician().name};
 state.memberPhotos[state.personId]=draft.photo||'';
 delete state.profileDrafts[profileDraftKey()];render();$('[data-action="edit-member-details"]')?.focus({preventScroll:true});toast('Member details saved for this demo.');
}
const profileActions={
 'edit-member-details':()=>{if(!canEditMemberDetails())return;state.profileDrafts[profileDraftKey()]={...memberDetails(),photo:memberPhoto(person())};render();$('#profile-height')?.focus({preventScroll:true});},
 'cancel-profile-edit':()=>{if(!canEditMemberDetails())return;delete state.profileDrafts[profileDraftKey()];render();$('[data-action="edit-member-details"]')?.focus({preventScroll:true});}
};
document.addEventListener('input',event=>{const field=event.target.dataset.profileField;if(field&&profileFieldNames.includes(field)&&activeProfileDraft())activeProfileDraft()[field]=event.target.value;});
document.addEventListener('submit',event=>{if(event.target.id==='member-details-form'){event.preventDefault();saveMemberDetails();}});
