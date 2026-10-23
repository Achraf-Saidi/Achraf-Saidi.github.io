(()=>{'use strict';
const key='achraf.workspace.jetnext.url';const card=document.querySelector('[data-project="jetnext"]');const trigger=document.querySelector('[data-configure="jetnext"]');const dialog=document.getElementById('linkDialog');const form=document.getElementById('linkForm');const input=document.getElementById('projectUrl');const err=document.getElementById('linkError');let href='';
function valid(url){try{const u=new URL(url);return u.protocol==='https:' && !!u.hostname && !u.username && !u.password;}catch{return false;}}
function refresh(){const saved=localStorage.getItem(key)||'';href=valid(saved)?saved:'';trigger.innerHTML=href?'Modifier le lien <span>↗</span>':'Ajouter le lien <span>→</span>';card.classList.toggle('has-link',!!href);card.tabIndex=href?0:-1;card.setAttribute('aria-label',href?'Ouvrir JetNext':'Configurer le lien JetNext');}
function openLink(){if(href)window.open(href,'_blank','noopener,noreferrer');else showDialog();}
function showDialog(){input.value=href;err.textContent='';dialog.showModal();input.focus();}
trigger.addEventListener('click',event=>{event.stopPropagation();showDialog();});
card.addEventListener('click',event=>{if(event.target.closest('button'))return;openLink();});
card.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ') && event.target===card){event.preventDefault();openLink();}});
document.getElementById('cancelLink').addEventListener('click',()=>dialog.close());
form.addEventListener('submit',event=>{event.preventDefault();const url=input.value.trim();if(!valid(url)){err.textContent='Utilise une URL HTTPS valide.';return;}localStorage.setItem(key,url);refresh();dialog.close();});
refresh();
})();