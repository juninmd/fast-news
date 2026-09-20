export const FONTS_HREF =
	"https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,750;1,6..72,400;1,6..72,600&family=Archivo+Narrow:wght@500;600;700&display=swap";

export const EDITION_CSS = `
body{--ground:#f3f5f2;--raised:#e7ebe6;--ink:#12181e;--muted:#56606b;--rule:#c5ccc7;--accent:#2146c7;--mark:#ffe36b;--bar-off:#c9d0cb;
--serif:"Newsreader",Georgia,"Times New Roman",serif;--label:"Archivo Narrow","Arial Narrow",Arial,sans-serif;--black:"UnifrakturMaguntia","Old English Text MT",Georgia,serif;
margin:0;background:var(--ground);color:var(--ink);font-family:var(--serif);font-size:17px;line-height:1.5;padding-inline:16px;padding-block:12px 48px}
body.noite{--ground:#0d1320;--raised:#151d2e;--ink:#ebe7dc;--muted:#9ba4b3;--rule:#2b3549;--accent:#f2a93b;--mark:#f2a93b;--bar-off:#263047;color-scheme:dark}
*{box-sizing:border-box}
a{color:inherit;text-decoration-color:var(--accent);text-underline-offset:3px}
a:hover{color:var(--accent)}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.wrap{max-width:1180px;margin-inline:auto}
.mast{border-bottom:3px double var(--ink);padding-block:8px 10px;display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:16px}
.ear{font:500 13px/1.35 var(--label);color:var(--muted);max-width:210px}
.ear b{display:block;color:var(--ink);font:700 22px/1.1 var(--serif);font-variant-numeric:tabular-nums}
.ear.r{justify-self:end;text-align:right}
.name{font:400 clamp(64px,11vw,128px)/.9 var(--black);margin:0;text-align:center}
.name i{font-style:normal;color:var(--accent)}
.folio{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 16px;border-bottom:1px solid var(--ink);padding-block:7px;font:600 13px/1.3 var(--label);text-transform:uppercase;letter-spacing:.08em}
.folio .ed{color:var(--accent)}
.ticker{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));border-bottom:1px solid var(--rule)}
.tick{padding:10px 12px;border-right:1px solid var(--rule)}
.tick:last-child{border-right:0}
.tick span{display:block;font:600 12px/1.2 var(--label);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.tick b{font:700 21px/1.2 var(--serif);font-variant-numeric:tabular-nums}
.tick small{font:500 13px/1.3 var(--label);color:var(--muted);display:block}
.tick small.up{color:#1a7f37}
.tick small.down{color:#cf222e}
body.noite .tick small.up{color:#4ade80}
body.noite .tick small.down{color:#f87171}
.thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:2px;margin:0 0 10px;display:block;background:var(--raised)}
.kicker{font:700 12.5px/1.2 var(--label);text-transform:uppercase;letter-spacing:.12em;color:var(--accent);margin:0 0 6px}
h2,h3,h4{text-wrap:balance;margin:0}
.lead h2{font:750 clamp(34px,5.2vw,56px)/1.03 var(--serif);letter-spacing:-.015em}
.deck{font:italic 400 clamp(19px,2.1vw,23px)/1.35 var(--serif);color:var(--muted);margin:12px 0 0;max-width:62ch}
h3{font:750 24px/1.13 var(--serif)}
h4{font:600 19px/1.2 var(--serif);margin-bottom:10px}
p{margin:.55em 0 0;max-width:68ch}
.src{font:500 12.5px/1.3 var(--label);color:var(--muted);margin-top:8px;display:block}
.src a{color:var(--muted)}
.q{font:italic 600 22px/1.3 var(--serif);border-left:3px solid var(--accent);padding-left:14px;margin:16px 0 0}
.q cite{display:block;font:500 13px/1.3 var(--label);font-style:normal;color:var(--muted);margin-top:4px}
.drop::first-letter{float:left;font:750 64px/.82 var(--serif);padding:6px 8px 0 0;color:var(--accent)}
.front{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(0,1fr);border-bottom:1px solid var(--ink)}
.front>.lead{padding:22px 24px 24px 0;border-right:1px solid var(--rule)}
.front>.rail{padding:22px 0 24px 24px;display:grid;gap:20px;align-content:start}
.cols{columns:2 260px;column-gap:28px;margin-top:16px}
.cols p{margin:0 0 .7em}
.rail article+article{border-top:1px solid var(--rule);padding-top:18px}
.sec{border-bottom:1px solid var(--ink);padding-block:22px}
.sec-h{display:flex;align-items:baseline;gap:12px;margin:0 0 16px}
.sec-h h2{font:700 13px/1 var(--label);text-transform:uppercase;letter-spacing:.16em}
.sec-h::after{content:"";flex:1;border-top:1px solid var(--rule);transform:translateY(-4px)}
.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 28px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 28px}
.brief{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.brief li{padding-top:10px;border-top:1px solid var(--rule);font-size:16px;line-height:1.4}
.brief li:first-child{border-top:0;padding-top:0}
.box{background:var(--raised);padding:18px 20px;border-radius:3px}
.thread{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}
.thread ol{list-style:none;margin:0;padding:0;position:relative}
.thread ol::before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:var(--accent);opacity:.55}
.thread li{position:relative;padding:0 0 14px 24px;font-size:15.5px;line-height:1.38}
.thread li::before{content:"";position:absolute;left:0;top:5px;width:12px;height:12px;border-radius:50%;background:var(--ground);border:2px solid var(--accent)}
.thread li:last-child::before{background:var(--accent)}
.thread time{display:block;font:700 12.5px/1.2 var(--label);color:var(--accent);font-variant-numeric:tabular-nums}
.pulse svg{display:block;width:100%;height:auto}
.pulse text{font:12px var(--label);fill:var(--muted)}
.note{font:500 13px/1.4 var(--label);color:var(--muted);margin-top:8px}
.quiz{display:grid;gap:18px}
.quiz fieldset{border:0;padding:0;margin:0}
.quiz legend{font:600 18px/1.3 var(--serif);margin-bottom:8px;padding:0}
.opts{display:flex;flex-wrap:wrap;gap:8px}
.opts button{font:600 14px/1 var(--label);border:1px solid var(--rule);background:var(--ground);color:var(--ink);padding:10px 14px;border-radius:3px;cursor:pointer}
.opts button.ok{background:#1f7a4d;border-color:#1f7a4d;color:#fff}
.opts button.no{background:#b3261e;border-color:#b3261e;color:#fff;text-decoration:line-through}
.score{font:700 15px/1.3 var(--label);min-height:1.3em}
.colophon{font:500 13.5px/1.5 var(--label);color:var(--muted);padding-top:18px}
@media (max-width:900px){.front{grid-template-columns:1fr}.front>.lead{padding-right:0;border-right:0}.front>.rail{padding-left:0;border-top:1px solid var(--rule)}.grid3,.thread{grid-template-columns:1fr 1fr}}
@media (max-width:620px){.mast{grid-template-columns:1fr;justify-items:center;text-align:center}.ear,.ear.r{justify-self:center;text-align:center;max-width:none}.grid3,.grid2,.thread{grid-template-columns:1fr}.tick{border-right:0;border-bottom:1px solid var(--rule)}}
`;

export const QUIZ_SCRIPT = `(function(){var qz=document.getElementById("quiz");if(!qz)return;var sc=document.getElementById("score"),total=qz.querySelectorAll("fieldset").length,right=0,done=0;
qz.querySelectorAll(".opts").forEach(function(box){box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b||b.disabled)return;var all=box.querySelectorAll("button");all.forEach(function(x){x.disabled=true;});var ok=+box.dataset.c;all[ok].classList.add("ok");if(+b.dataset.i!==ok)b.classList.add("no");else right++;done++;sc.textContent=right+" de "+done+(done===total?" respondidas.":" até aqui");});});})();`;
