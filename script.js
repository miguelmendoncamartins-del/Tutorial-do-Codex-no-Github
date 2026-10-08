const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  toggle.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
  nav.classList.toggle('open', !open);
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  });
});

const stage = document.querySelector('.hero-stage');
const fighter = document.querySelector('.fighter');
if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  stage.addEventListener('pointermove', (event) => {
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    fighter.style.transform = `translate(calc(-50% + ${x * 9}px), calc(-48% + ${y * 7}px)) rotateY(${-9 + x * 5}deg) rotateZ(${-4 - x * 1.5}deg)`;
  });
  stage.addEventListener('pointerleave', () => {
    fighter.style.transform = '';
  });
}

// Arena de luta: combate arcade desenhado em canvas, sem dependências externas.
const canvas = document.querySelector('#battle-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const W = 960, H = 420;
  canvas.width = W; canvas.height = H;
  const held = new Set();
  const keys = new Set();
  const healthBars = [document.querySelector('#player-health'), document.querySelector('#enemy-health')];
  const healthLabels = [document.querySelector('#player-health-label'), document.querySelector('#enemy-health-label')];
  const status = document.querySelector('#game-status');
  let player, enemy, shots, sparks, last = performance.now(), elapsed = 0, ended = false, messageTimer = 0;
  function reset() {
    player = {x:260,y:282,hp:100,ki:20,face:1,attack:0,dodge:0,transform:0,flash:0};
    enemy = {x:700,y:282,hp:100,ki:0,face:-1,attack:0,flash:0};
    shots=[]; sparks=[]; ended=false; status.textContent='PRONTO PARA LUTAR';
    healthBars.forEach(b=>b.style.width='100%'); healthLabels.forEach(b=>b.textContent='100%');
  }
  function say(text, time=1.2){status.textContent=text;messageTimer=time;}
  function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*180;sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.35+Math.random()*.5,color});}}
  function press(k){k=k.toLowerCase();keys.add(k);if(ended)return;
    if(k==='j'&&player.attack<=0){player.attack=.28;let d=Math.hypot(enemy.x-player.x,enemy.y-player.y);if(d<112){enemy.hp=Math.max(0,enemy.hp-(player.transform?12:8));enemy.flash=.16;burst(enemy.x,enemy.y-45,'#ffd477',8);say('COMBO!');}}
    if(k==='k'&&player.ki>=20&&player.attack<=0){player.ki-=20;player.attack=.42;shots.push({x:player.x+player.face*38,y:player.y-63,vx:player.face*500,owner:'player',life:1.8,color:player.transform?'#ffe869':'#69d9ff'});say('RAJADA DE KI!');}
    if(k==='l'){player.ki=Math.min(100,player.ki+22);burst(player.x,player.y-40,'#72d9ff',10);say('KI +22');}
    if(k===' '&&player.dodge<=0){player.dodge=.35;player.x=Math.max(90,Math.min(870,player.x-player.face*85));say('ESQUIVA!');}
    if(k==='u'&&player.ki>=35&&!player.transform){player.ki-=35;player.transform=1;burst(player.x,player.y-45,'#ffd85b',30);say('SUPER SAIYAJIN!');}
  }
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(!held.has(k)){held.add(k);press(k);}});
  window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
  document.querySelectorAll('.touch-controls [data-key]').forEach(btn=>{
    const k=btn.dataset.key;const start=e=>{e.preventDefault();held.add(k);press(k);};const end=e=>{e.preventDefault();held.delete(k);};
    btn.addEventListener('pointerdown',start);btn.addEventListener('pointerup',end);btn.addEventListener('pointerleave',end);btn.addEventListener('pointercancel',end);
  });
  document.querySelector('#restart-game').addEventListener('click',reset);
  function update(dt){
    if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0&&!ended)status.textContent='LUTE!';}
    if(ended)return;
    player.attack=Math.max(0,player.attack-dt);player.dodge=Math.max(0,player.dodge-dt);player.flash=Math.max(0,player.flash-dt);enemy.attack=Math.max(0,enemy.attack-dt);enemy.flash=Math.max(0,enemy.flash-dt);
    let dx=(held.has('d')||held.has('arrowright')?1:0)-(held.has('a')||held.has('arrowleft')?1:0),dy=(held.has('s')||held.has('arrowdown')?1:0)-(held.has('w')||held.has('arrowup')?1:0);
    const len=Math.hypot(dx,dy)||1;player.x+=dx/len*220*dt;player.y+=dy/len*150*dt;player.x=Math.max(90,Math.min(870,player.x));player.y=Math.max(170,Math.min(345,player.y));
    player.face=enemy.x>=player.x?1:-1;enemy.face=player.x>=enemy.x?1:-1;
    // Freeza persegue e alterna golpes próximos com rajadas de energia.
    const ex=player.x-enemy.x,ey=player.y-enemy.y,dist=Math.hypot(ex,ey);
    if(dist>105){enemy.x+=ex/(dist||1)*105*dt;enemy.y+=ey/(dist||1)*75*dt;}
    if(enemy.attack<=0){enemy.attack=dist<118?1.0:1.45;if(dist<118){if(player.dodge<=0){player.hp=Math.max(0,player.hp-7);player.flash=.2;burst(player.x,player.y-45,'#ff795d',8);say('FREEZA ATACOU!');}}else shots.push({x:enemy.x+enemy.face*34,y:enemy.y-61,vx:enemy.face*310,owner:'enemy',life:2,color:'#fa57b9'});}
    shots=shots.filter(s=>{s.x+=s.vx*dt;s.life-=dt;if(s.owner==='player'&&Math.hypot(s.x-enemy.x,s.y-(enemy.y-62))<37){enemy.hp=Math.max(0,enemy.hp-(player.transform?24:17));enemy.flash=.2;burst(s.x,s.y,s.color,16);return false;}if(s.owner==='enemy'&&Math.hypot(s.x-player.x,s.y-(player.y-62))<34){if(player.dodge<=0){player.hp=Math.max(0,player.hp-12);player.flash=.2;burst(s.x,s.y,s.color,12);}return false;}return s.life>0&&s.x>0&&s.x<W;});
    sparks=sparks.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy=p.vy*.95+65*dt;p.life-=dt;return p.life>0;});
    healthBars[0].style.width=player.hp+'%';healthBars[1].style.width=enemy.hp+'%';healthLabels[0].textContent=Math.ceil(player.hp)+'%';healthLabels[1].textContent=Math.ceil(enemy.hp)+'%';
    if(player.hp<=0||enemy.hp<=0){ended=true;say(enemy.hp<=0?'VITÓRIA! GOKU VENCEU':'DERROTA! TENTE DE NOVO',999);}
  }
  function fighter(f,isPlayer){
    const x=f.x,y=f.y,scale=.78+(y-170)/175*.22;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    if(f.transform&&isPlayer){ctx.shadowColor='#ffe44d';ctx.shadowBlur=34;ctx.fillStyle='#ffe66a';ctx.beginPath();ctx.ellipse(0,-62,42,72,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    if(f.dodge){ctx.globalAlpha=.48;}
    ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(0,0,36,10,0,0,Math.PI*2);ctx.fill();
    const skin=f.flash?'#fff':(isPlayer?'#efbd91':'#e9d9dc');
    // pernas e botas
    ctx.fillStyle=isPlayer?'#24459b':'#6b5bce';ctx.fillRect(-20,-41,16,42);ctx.fillRect(5,-41,16,42);
    ctx.fillStyle=isPlayer?'#f0e5d4':'#eee7e8';ctx.fillRect(-23,-5,23,9);ctx.fillRect(3,-5,23,9);
    // gi, braços e faixa
    ctx.fillStyle=isPlayer?'#f47b24':'#f0e9ec';ctx.beginPath();ctx.moveTo(-28,-106);ctx.lineTo(27,-106);ctx.lineTo(34,-43);ctx.lineTo(-32,-43);ctx.closePath();ctx.fill();
    ctx.fillStyle=isPlayer?'#2747a1':'#ca294c';ctx.fillRect(-30,-51,62,8);
    ctx.fillStyle=skin;ctx.fillRect(-39,-100,12,48);ctx.fillRect(27,-100,12,48);
    // cabeça e cabelo
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(0,-123,22,25,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=isPlayer?(f.transform?'#ffdc43':'#171521'):'#e7e4ea';ctx.beginPath();ctx.moveTo(-23,-132);ctx.lineTo(-29,-160);ctx.lineTo(-10,-147);ctx.lineTo(-5,-174);ctx.lineTo(8,-148);ctx.lineTo(25,-165);ctx.lineTo(20,-136);ctx.closePath();ctx.fill();
    ctx.fillStyle='#211b25';ctx.fillRect(f.face>0?3:-10,-128,7,3);
    // aura ring
    if(isPlayer&&f.ki>0){ctx.strokeStyle='#55cfff88';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-70,43,76,0,0,Math.PI*2*f.ki/100);ctx.stroke();}
    if(f.attack>0){ctx.strokeStyle=isPlayer?'#fff29a':'#ff6f8c';ctx.lineWidth=5;ctx.beginPath();ctx.arc(f.face*37,-78,22,-1.1,1.1);ctx.stroke();}
    ctx.restore();
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#15283e');sky.addColorStop(.62,'#4b5360');sky.addColorStop(1,'#bf8150');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffc66b';ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(750,100,48,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // montanhas, chão e linhas de perspectiva
    ctx.fillStyle='#27364a';ctx.beginPath();ctx.moveTo(0,240);ctx.lineTo(140,140);ctx.lineTo(280,236);ctx.lineTo(425,157);ctx.lineTo(590,242);ctx.lineTo(760,153);ctx.lineTo(960,235);ctx.lineTo(960,300);ctx.lineTo(0,300);ctx.fill();
    ctx.fillStyle='#75604f';ctx.fillRect(0,260,W,160);ctx.fillStyle='#9b7655';ctx.beginPath();ctx.moveTo(0,260);ctx.lineTo(W,260);ctx.lineTo(W,420);ctx.lineTo(0,420);ctx.fill();
    ctx.strokeStyle='#e2b77a35';ctx.lineWidth=1;for(let i=0;i<9;i++){const yy=267+i*i*2.2;ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke();}for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(480,260);ctx.lineTo(i*105-60,420);ctx.stroke();}
    shots.forEach(s=>{ctx.save();ctx.shadowColor=s.color;ctx.shadowBlur=22;ctx.fillStyle=s.color;ctx.beginPath();ctx.ellipse(s.x,s.y,18,8,0,0,Math.PI*2);ctx.fill();ctx.restore();});
    const actors=[{f:player,p:true},{f:enemy,p:false}].sort((a,b)=>a.f.y-b.f.y);actors.forEach(a=>fighter(a.f,a.p));
    sparks.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);});ctx.globalAlpha=1;
    // medidor de Ki do jogador
    ctx.fillStyle='#101722cc';ctx.fillRect(18,18,155,29);ctx.fillStyle='#62d9ff';ctx.fillRect(24,36,143*player.ki/100,5);ctx.fillStyle='#e5f7ff';ctx.font='bold 11px DM Sans';ctx.fillText('KI  '+Math.floor(player.ki)+'%',24,31);
    if(player.transform){ctx.fillStyle='#ffe876';ctx.font='bold 10px DM Sans';ctx.fillText('SUPER SAIYAJIN',24,62);}
  }
  function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;if(!ended&&player.ki<100&&held.has('l'))player.ki=Math.min(100,player.ki+36*dt);update(dt);draw();requestAnimationFrame(frame);}
  reset();requestAnimationFrame(frame);
}
