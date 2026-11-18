// Static, read-only visual preview. Never acknowledges writes or calls production APIs.
const nativeFetch = globalThis.fetch.bind(globalThis);
const snapshotResponse = await nativeFetch('/achraf-notebooks/espace/assets/demo-data.json');
if (!snapshotResponse.ok) throw new Error('Aperçu indisponible');
const snapshots = await snapshotResponse.json();
const response = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}}));
globalThis.fetch = (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input,init);
  const key = url.pathname + url.search;
  const method = (init.method || 'GET').toUpperCase();
  if (url.pathname === '/api/workspace/tutor' && method === 'POST') {
    const {moduleId} = JSON.parse(init.body || '{}');
    const sources = (snapshots['/api/workspace/lessons?module=C3'].lessons || []).filter(l=>l.module_id === moduleId).map(l=>({id:l.id,title:l.title,revision:l.revision,excerpt:l.blocks.filter(b=>['text','callout'].includes(b.type)).map(b=>b.text).join('\n')}));
    return response({mode:'sources', answer:'Le tuteur génératif n’est pas activé. Voici les sources de démonstration, sans réponse générée par une IA.',sources,publicCourse:'https://achraf-saidi.github.io/achraf-notebooks/academy/fr/?id='+encodeURIComponent(moduleId)});
  }
  if (method !== 'GET') return response({message:'Cet aperçu est en consultation uniquement. Les modifications ne sont pas enregistrées ; les comptes, examens et paiements réels ne sont pas activés.'},409);
  if (key in snapshots) return response(snapshots[key]);
  if (url.pathname === '/api/workspace/lessons') return response({lessons:[]});
  if (url.pathname.startsWith('/api/admin/questions/')) return response({questions:[]});
  if (url.pathname === '/api/admin/learners') return response({learners:[],page:Number(url.searchParams.get('page'))||0});
  return response({message:'Cette fonction nécessite le serveur complet et ne fait pas partie de cet aperçu en consultation.'},503);
};
document.addEventListener('click', event => {
 const a = event.target.closest('a');
 if(a && ['/exam','/learning'].includes(new URL(a.href,location.origin).pathname)) {
   event.preventDefault();
   const toast=document.querySelector('#toast');
   toast.textContent='Les épreuves nécessitent le serveur complet. Cet aperçu permet de consulter les résultats et les écrans.';
   toast.classList.add('visible');
   setTimeout(()=>toast.classList.remove('visible'),6000);
 }
},true);
