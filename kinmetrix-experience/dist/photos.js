/* Local photo capture for demo profiles. Images never leave this browser. */
function memberPhoto(p){return state.memberPhotos?.[p.id]||'';}
function photoAvatar(p,cls=''){
 return memberPhoto(p)?`<button type="button" class="photo-avatar-button" data-action="preview-profile-photo" data-id="${p.id}" aria-label="View photo of ${escapeHTML(p.name)}" aria-haspopup="dialog">${avatar(p,cls)}</button>`:avatar(p,cls);
}
function profilePhotoDialog(o){
 const p=people.find(p=>p.id===o.personId);
 return `<div class="modal-backdrop photo-viewer-backdrop"><section class="dialog photo-viewer" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header class="dialog-header"><h2 id="dialog-title">${escapeHTML(p.name)}</h2><button class="icon-button" data-action="close-modal" aria-label="Close photo">${icon('close')}</button></header><img class="profile-photo-large" src="${memberPhoto(p)}" alt="Profile photo of ${escapeHTML(p.name)}"></section></div>`;
}
function photoDraft(context){
 if(state.actor!=='coach')return null;
 return context==='new-person'?(state.overlay?.type==='add-person'?state.overlay:null):context==='profile'?activeProfileDraft():null;
}
function photoCaptureControl(context,draft={}){
 const photo=draft.photo||'',busy=!!draft.photoLoading,error=draft.photoError||'';
 return `<section class="photo-capture" id="photo-${context}" aria-label="Profile photo" aria-busy="${busy}"><div class="photo-capture-row"><div class="photo-preview">${photo?`<img src="${photo}" alt="Selected profile photo">`:icon('camera')}</div><div class="photo-options"><h3>Profile photo <span>Optional</span></h3><div class="photo-actions"><button type="button" class="button primary small-button" data-action="choose-photo" data-context="${context}" data-source="camera" ${busy?'disabled':''}>${icon('camera','icon-sm')} ${photo?'Retake':'Take photo'}</button><button type="button" class="text-button" data-action="choose-photo" data-context="${context}" data-source="library" ${busy?'disabled':''}>${photo?'Change photo':'Choose photo'}</button>${photo?`<button type="button" class="text-button" data-action="remove-photo" data-context="${context}" ${busy?'disabled':''}>Remove</button>`:''}</div><p class="photo-help" role="status">${busy?'Preparing photo…':photo?'Used on the roster and session screen.':'Keep their face centered in the picture.'}</p></div></div>${error?`<p class="photo-error" role="alert">${escapeHTML(error)}</p>`:''}<input type="file" id="photo-${context}-camera" data-photo-context="${context}" accept="image/*" capture="user" hidden><input type="file" id="photo-${context}-library" data-photo-context="${context}" accept="image/*" hidden></section>`;
}
function refreshPhotoControl(context,focus=false){
 const draft=photoDraft(context),slot=$('#photo-'+context);if(!draft||!slot)return;
 slot.outerHTML=photoCaptureControl(context,draft);
 const submit=context==='new-person'?$('#add-person-form button[type="submit"]'):$('button[form="member-details-form"]');
 if(submit)submit.disabled=!!draft.photoLoading;
 if(focus)$(`#photo-${context} [data-action="choose-photo"]`)?.focus({preventScroll:true});
}
async function prepareProfilePhoto(file){
 if(file.size>20*1024*1024)throw new Error('Choose a photo smaller than 20 MB.');
 if((file.type&&!file.type.startsWith('image/'))||file.type==='image/svg+xml')throw new Error('Choose a photo in JPG, PNG, WebP or HEIC format.');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('This photo could not be opened. Try a JPG or PNG, or take a new photo.'));img.src=url;});
  const side=Math.min(img.naturalWidth,img.naturalHeight),canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('The photo could not be prepared. Please try another image.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,512,512);
  ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,512,512);
  return canvas.toDataURL('image/jpeg',.88);
 }finally{URL.revokeObjectURL(url);}
}
const photoActions={
 'preview-profile-photo':el=>{
  const p=people.find(p=>p.id===el.dataset.id);
  if(!p||!memberPhoto(p)||state.overlay||state.stage==='live')return;
  if(state.actor==='coach'?!visiblePeople().some(member=>member.id===p.id):state.personId!==p.id)return;
  el.focus();openModal('profile-photo',{personId:p.id});
 },
 'choose-photo':el=>{const context=el.dataset.context,draft=photoDraft(context);if(!draft||draft.photoLoading||!['camera','library'].includes(el.dataset.source))return;$('#photo-'+context+'-'+el.dataset.source)?.click();},
 'remove-photo':el=>{const draft=photoDraft(el.dataset.context);if(!draft||draft.photoLoading)return;draft.photo='';draft.photoError='';refreshPhotoControl(el.dataset.context,true);}
};
document.addEventListener('change',async event=>{
 const context=event.target.dataset.photoContext;if(!context)return;
 const file=event.target.files?.[0],draft=photoDraft(context);if(!file||!draft||draft.photoLoading)return;
 draft.photoLoading=true;draft.photoError='';refreshPhotoControl(context);
 try{const photo=await prepareProfilePhoto(file);if(photoDraft(context)===draft)draft.photo=photo;}
 catch(error){if(photoDraft(context)===draft)draft.photoError=error.message||'The photo could not be prepared. Try again.';}
 finally{draft.photoLoading=false;if(photoDraft(context)===draft)refreshPhotoControl(context,true);}
});

document.addEventListener('click',event=>{
 if(state.overlay?.type==='profile-photo'&&event.target.classList.contains('photo-viewer-backdrop'))closeModal();
});
