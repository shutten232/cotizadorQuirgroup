(function(){
  const C = window.COTIZADOR;
  if(!C || !C.DATA){
    // Mostrar error visible (no solo alert)
    document.addEventListener("DOMContentLoaded", ()=>{
      const box = document.getElementById("fatal");
      if(box){
        box.style.display="block";
        box.textContent="Error: no se cargó data.js. Extraé el ZIP y abrí app/index.html (no dentro del ZIP).";
      }else{
        alert("Error: no se cargó data.js. Extraé el ZIP y abrí app/index.html.");
      }
    });
    return;
  }

  const { DATA, ORDER, MAIN_PAY, SUB_PAY, MULT, SPLIT_TOTAL } = C;
  const $ = (id) => document.getElementById(id);

  let gen = "5ta";
  let cil = "14";
  let mainPay = "efectivo";
  let subPay = "a6";

  function parseMoney(str){
    if(str==null) return null;
    const s = String(str).trim().replace(/\./g,"");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  function fmt(n){
    if(n==null) return "—";
    const s = String(Math.round(n));
    return "$ " + s.replace(/\B(?=(\d{3})+(?!\d))/g,".");
  }
  function labelCil(key){
    if(key.startsWith("2*")) return `2×${key.slice(2)} L`;
    return `${key} L`;
  }
  function currentKey(){
    return (mainPay === "fin") ? subPay : mainPay;
  }
  function payLabel(){
    if(mainPay !== "fin") return MAIN_PAY.find(x=>x.k===mainPay)?.t || mainPay;
    return "FIN " + (SUB_PAY.find(x=>x.k===subPay)?.t || subPay);
  }

  function buildCilSelect(){
    const sel = $("cilSelect");
    sel.innerHTML = "";
    for(const k of ORDER){
      if(!DATA[gen][k]) continue;
      const o = document.createElement("option");
      o.value = k;
      o.textContent = labelCil(k);
      sel.appendChild(o);
    }
    if(!DATA[gen][cil]) cil = ORDER.find(x=>DATA[gen][x]) || "14";
    sel.value = cil;
  }

  function renderPay(){
    const box = $("payMain");
    box.innerHTML = "";
    for(const p of MAIN_PAY){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "payBtn" + (p.k===mainPay ? " active" : "");
      b.innerHTML = `<div class="t">${p.t}</div><div class="d">${p.d}</div>`;
      b.onclick = () => {
        mainPay = p.k;
        [...box.children].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        $("subPay").classList.toggle("show", mainPay==="fin");
        renderSubPay();
        render();
      };
      box.appendChild(b);
    }
  }

  function renderSubPay(){
    const box = $("paySub");
    box.innerHTML = "";
    if(mainPay !== "fin") return;
    for(const p of SUB_PAY){
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (p.k===subPay ? " active" : "");
      b.innerHTML = `${p.t}<span>${p.d}</span>`;
      b.onclick = () => {
        subPay = p.k;
        [...box.children].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        render();
      };
      box.appendChild(b);
    }
  }

  function compute(){
    const r = DATA[gen][cil];
    const cilRef = parseMoney(r.cilindro);
    const key = currentKey();
    const v = parseMoney(r[key]);

    if(MULT[key] != null){
      const cuota = v;
      const total = v * MULT[key];
      const detail = `Cuota ${fmt(cuota)} × ${MULT[key]} (tabla)`;
      return { key, cilRef, cuota, total, detail };
    }
    if(SPLIT_TOTAL[key] != null){
      const total = v;
      const n = SPLIT_TOTAL[key];
      const cuota = Math.round(total / n);
      const detail = `${n} cuotas de ${fmt(cuota)} (total tabla)`;
      return { key, cilRef, cuota, total, detail };
    }
    return { key, cilRef, cuota:null, total:v, detail:"Total (tabla)" };
  }

  function oneLineMessage(c){
    const cap = labelCil(cil);
    const p = payLabel();
    const base = `${gen} · ${cap} · ${p} → ${fmt(c.total)}`;
    if(MULT[c.key]) return `${base} (Cuota ${fmt(c.cuota)} x${MULT[c.key]})`;
    if(SPLIT_TOTAL[c.key]) return `${base} (Cuota ${fmt(c.cuota)} x${SPLIT_TOTAL[c.key]})`;
    return base;
  }

  function toast(msg){
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 900);
  }

  function render(){
    const c = compute();
    $("status").textContent = `${gen} · ${labelCil(cil)} · ${payLabel()}`;
    $("payLabel").textContent = payLabel();
    $("line1").textContent = `${gen} · ${labelCil(cil)} · ${payLabel()}`;
    $("totalBig").textContent = fmt(c.total);
    $("cilRef").textContent = fmt(c.cilRef);
    $("cuotaRef").textContent = (c.cuota!=null) ? fmt(c.cuota) : "—";
    $("detail").textContent = c.detail;
  }

  
  function fmtBareFromStr(str){
    const n = parseMoney(str);
    if(n==null) return "";
    const s = String(Math.round(n));
    return s.replace(/\B(?=(\d{3})+(?!\d))/g,".");
  }
  function todayAR(){
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  function openPresupuesto(){
    const r = DATA[gen][cil];
    const payload = {
      gen,
      cil,
      // UI
      vehiculoTitle: ((document.getElementById("modeloInput")?.value || "").trim() || "MODELO"),
      asesor: ((document.getElementById("asesorInput")?.value || "").trim() || "NOMBRE"),
      equipo: `${gen.toUpperCase()} – ${cil} MTS`,
      // campos del presupuesto
      fecha: todayAR(),
      precioDestacado: fmtBareFromStr(r.efectivo),
      precioLista: fmtBareFromStr(r.lista),
      promo3: fmtBareFromStr(r.a3),          // cuota 3
      debito: fmtBareFromStr(r.trf),         // total transferencia
      cordo6: fmtBareFromStr(r.a6),          // cuota 6
      naranja6: fmtBareFromStr(r.a6),        // cuota 6 (naranja)
      naranja8: fmtBareFromStr(r.n8),        // cuota 8
      naranja12: fmtBareFromStr(r.n12),       // cuota 12
      // extras opcionales
      cilRef: fmtBareFromStr(r.cilindro),
      cuota12_total: fmtBareFromStr(parseMoney(r.n12)*12),
      cuota8_total: fmtBareFromStr(parseMoney(r.n8)*8),
      cuota6_total: fmtBareFromStr(parseMoney(r.a6)*6),
      cuota3_total: fmtBareFromStr(parseMoney(r.a3)*3),
    };

    const json = JSON.stringify(payload);
    // Guardar también en localStorage como respaldo
    try{ localStorage.setItem("PRESUPUESTO_PAYLOAD", json); }catch(e){}
    // Pasar por hash (funciona incluso en file://)
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const url = "../presupuesto/index.html#data=" + encodeURIComponent(b64);
    window.open(url, "_blank");
  }


async function copy(){
    const c = compute();
    const text = oneLineMessage(c);
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text);
        toast("Copiado");
        return;
      }
      // Fallback para file:// o contextos inseguros
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly","");
      ta.style.position="fixed";
      ta.style.left="-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("Copiado");
    }catch{
      window.prompt("Copiar:", text);
    }
  }

  function resetAll(){
    gen="5ta"; cil="14"; mainPay="efectivo"; subPay="a6";
    $("gen5").classList.add("active");
    $("gen4").classList.remove("active");
    buildCilSelect();
    renderPay();
    $("subPay").classList.toggle("show", mainPay==="fin");
    renderSubPay();
    render();
    toast("Reset");
  }

  function init(){
    // Capturar errores y mostrarlos
    window.addEventListener("error",(e)=>{
      const box = $("fatal");
      if(box){
        box.style.display="block";
        box.textContent="Error JS: " + (e.message || e.error || "desconocido");
      }
    });

    $("gen5").onclick = () => {
      gen="5ta";
      $("gen5").classList.add("active");
      $("gen4").classList.remove("active");
      buildCilSelect();
      render();
    };
    $("gen4").onclick = () => {
      gen="4ta";
      $("gen4").classList.add("active");
      $("gen5").classList.remove("active");
      buildCilSelect();
      render();
    };
    $("cilSelect").onchange = (e) => { cil = e.target.value; render(); };

    $("copyBtn").onclick = copy;
    $("copyTop").onclick = copy;
    const btnP = $("openPresupuesto");
    if(btnP) btnP.onclick = openPresupuesto;
    $("resetBtn").onclick = resetAll;

    buildCilSelect();
    renderPay();
    $("subPay").classList.toggle("show", mainPay==="fin");
    renderSubPay();
    render();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
