/**
 * Botão de favoritos ("bookmarklet") usado quando a RE/MAX bloqueia o servidor.
 * Clicado na página de um anúncio em remax.com.br, ele lê os dados do próprio site
 * (mesma origem) e mostra uma caixa com o texto para copiar e colar no painel.
 */
const source = `(async()=>{try{
var m=location.pathname.match(/(\\d{6,12}-\\d{1,6})\\/?$/);if(!m){alert('Abra a página de um anúncio da RE/MAX.');return}
var id=m[1];
var S=async function(i,t){var r=await fetch('/search/'+i+'/docs/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({search:'"'+t+'"',top:10})});var j=await r.json();return (j.value||[]).map(function(v){return typeof v.content=='string'?JSON.parse(v.content):v.content})};
var l=(await S('listing-search',id)).find(function(c){return c.MLSID==id});if(!l){alert('Anúncio não encontrado.');return}
var L=await (await fetch('/locales_v2/pt-BR/lookups.json')).json();var T=await (await fetch('/locales_v2/pt-BR/translate.json')).json();
var lk={};L.forEach(function(x){lk[x.ItemName]=x.Translation});
var used={};Object.keys(l).forEach(function(k){var v=l[k];if((typeof v=='number'||typeof v=='string')&&/UID$|DesignatedLandUse/.test(k)&&lk[String(v)]!==undefined)used[String(v)]=lk[String(v)]});
var tr={};(l.ListingFeatures||[]).forEach(function(f){if(T[f.FeatureName])tr[f.FeatureName]=T[f.FeatureName]});
var ag={};var ids=[l.RepresentingAgentID,l.AgentId];for(var n=0;n<ids.length;n++){var a=ids[n];if(!a)continue;var d=(await S('agent-search',String(a))).find(function(c){return c.AgentId==a});if(d){ag={agentName:d.AgentName,officeName:d.OfficeName};break}}
var txt=JSON.stringify({listing:l,labels:{lookups:used,translations:tr},agent:ag});
var box=document.createElement('div');box.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-family:sans-serif';
box.innerHTML='<div style="background:#fff;max-width:520px;width:92%;border-radius:12px;padding:20px"><b style="font-size:16px">Anúncio '+id+' pronto</b><p style="font-size:14px;color:#444">Clique em Copiar e cole no painel do Paulo Pop, em Importar da RE/MAX &rarr; Colar dados.</p><textarea style="width:100%;height:90px;font-size:11px" readonly></textarea><div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button data-x style="padding:8px 14px">Fechar</button><button data-c style="padding:8px 14px;background:#0D2F5E;color:#fff;border:0;border-radius:6px">Copiar</button></div></div>';
document.body.appendChild(box);var ta=box.querySelector('textarea');ta.value=txt;
box.querySelector('[data-x]').onclick=function(){box.remove()};
box.querySelector('[data-c]').onclick=async function(){try{await navigator.clipboard.writeText(txt)}catch(e){ta.select();document.execCommand('copy')}this.textContent='Copiado!'};
}catch(e){alert('Erro ao ler o anúncio: '+e.message)}})();`

export const REMAX_BOOKMARKLET = 'javascript:' + encodeURIComponent(source.replace(/\n/g, ''))
