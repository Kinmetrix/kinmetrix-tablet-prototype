/* Report header: the session note is a button beside Export, so the chart sits higher. */
// Close the note panel when tapping elsewhere or pressing Escape.
document.addEventListener('click',event=>{const open=document.querySelector('.note-action details[open]');if(open&&!open.contains(event.target))open.open=false;});
document.addEventListener('keydown',event=>{const open=document.querySelector('.note-action details[open]');if(open&&event.key==='Escape'&&!state.overlay){open.open=false;open.querySelector('summary')?.focus();}});
