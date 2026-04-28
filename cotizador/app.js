(function(){
  const C = window.COTIZADOR;
  if(!C || !C.DATA){
    document.addEventListener("DOMContentLoaded", ()=>{
      const box = document.getElementById("fatal");
      if(box){ box.style.display="block"; box.textContent="Error: no se cargó data.js. Extraé el ZIP y abrí cotizador/index.html (no dentro del ZIP)."; }
    });
    return;
  }

  const { DATA, ORDER, MAIN_PAY, SUB_PAY, MULT, SPLIT_TOTAL } = C;
  const $ = (id) => document.getElementById(id);

  let gen = "5ta", cil = "14", mainPay = "efectivo", subPay = "a6";

  /* ── UTILS ── */
  function parseMoney(str){
    if(str==null) return null;
    const n = Number(String(str).trim().replace(/\./g,""));
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  function fmt(n){
    if(n==null) return "—";
    return "$ " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".");
  }
  function fmtBare(n){
    if(n==null) return "";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,".");
  }
  function fmtBareFromStr(str){
    return fmtBare(parseMoney(str));
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
  function todayAR(){
    const d = new Date();
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }

  /* ── BUILD CYLINDER SELECT ── */
  function buildCilSelect(){
    const sel = $("cilSelect");
    sel.innerHTML = "";
    for(const k of ORDER){
      if(!DATA[gen][k]) continue;
      const o = document.createElement("option");
      o.value = k; o.textContent = labelCil(k);
      sel.appendChild(o);
    }
    if(!DATA[gen][cil]) cil = ORDER.find(x=>DATA[gen][x]) || "14";
    sel.value = cil;
  }

  /* ── PAYMENT BUTTONS ── */
  function renderPay(){
    const box = $("payMain");
    box.innerHTML = "";
    for(const p of MAIN_PAY){
      const r = DATA[gen][cil];
      let priceHint = "";
      if(p.k === "fin"){
        priceHint = "Ver cuotas ↓";
      } else {
        const v = parseMoney(r[p.k]);
        if(v) priceHint = fmt(v);
      }
      const b = document.createElement("button");
      b.type = "button";
      b.className = "payBtn" + (p.k===mainPay ? " active" : "");
      b.innerHTML = `<div class="t">${p.t}</div><div class="ph">${priceHint}</div><div class="d">${p.d}</div>`;
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
    const r = DATA[gen][cil];
    for(const p of SUB_PAY){
      const cuota = parseMoney(r[p.k]);
      const total = cuota ? cuota * MULT[p.k] : null;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mini" + (p.k===subPay ? " active" : "");
      b.innerHTML = `<div class="mt">${p.t}</div><div class="mc">${cuota ? fmt(cuota) : "—"}</div><div class="ms">${p.d}</div>`;
      b.onclick = () => {
        subPay = p.k;
        [...box.children].forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        render();
      };
      box.appendChild(b);
    }
  }

  /* ── COMPUTE ── */
  function compute(){
    const r = DATA[gen][cil];
    const cilRef = parseMoney(r.cilindro);
    const key = currentKey();
    const v = parseMoney(r[key]);
    if(MULT[key] != null){
      const cuota = v, total = v * MULT[key];
      return { key, cilRef, cuota, total, detail:`Cuota ${fmt(cuota)} × ${MULT[key]}` };
    }
    if(SPLIT_TOTAL[key] != null){
      const total = v, n = SPLIT_TOTAL[key], cuota = Math.round(total/n);
      return { key, cilRef, cuota, total, detail:`${n} cuotas de ${fmt(cuota)}` };
    }
    return { key, cilRef, cuota:null, total:v, detail:"Total (tabla)" };
  }

  /* ── PRICE TABLE ── */
  function renderPriceTable(){
    const r = DATA[gen][cil];
    const box = $("priceTable");
    $("tableLabel").textContent = `${gen} · ${labelCil(cil)}`;
    const rows = [
      { label:"Efectivo",           val: parseMoney(r.efectivo), type:"total" },
      { label:"Transferencia",      val: parseMoney(r.trf),      type:"total" },
      { label:"3 cuotas s/i",       cuota: parseMoney(r.a3),     n:3,  total: parseMoney(r.a3)*3 },
      { label:"P. Lista",           val: parseMoney(r.lista),    type:"total" },
      { label:"Fin. 6 cuotas s/i",  cuota: parseMoney(r.a6),     n:6,  total: parseMoney(r.a6)*6 },
      { label:"Fin. 8 cuotas",      cuota: parseMoney(r.n8),     n:8,  total: parseMoney(r.n8)*8 },
      { label:"Fin. 12 cuotas",     cuota: parseMoney(r.n12),    n:12, total: parseMoney(r.n12)*12 },
    ];
    const cur = currentKey();
    box.innerHTML = rows.map(row => {
      const isCur = (row.type === "total")
        ? (cur === (row.label==="Efectivo"?"efectivo": row.label==="Transferencia"?"trf": row.label==="P. Lista"?"lista":""))
        : (cur === (row.n===3?"a3": row.n===6?"a6": row.n===8?"n8":"n12") && mainPay==="fin" || (cur==="c3"&&row.n===3&&mainPay==="c3"));
      const active = isCur ? " active" : "";
      if(row.cuota){
        return `<div class="tRow${active}">
          <div class="tLabel">${row.label}</div>
          <div class="tCuota">${fmt(row.cuota)} <span>c/cuota</span></div>
          <div class="tTotal">Total ${fmt(row.total)}</div>
        </div>`;
      } else {
        return `<div class="tRow${active}">
          <div class="tLabel">${row.label}</div>
          <div class="tCuota big">${fmt(row.val)}</div>
          <div class="tTotal"></div>
        </div>`;
      }
    }).join("");
  }

  /* ── RENDER ── */
  function render(){
    const c = compute();
    const lbl = payLabel();
    const cap = labelCil(cil);
    $("status").textContent = `${gen} · ${cap} · ${lbl}`;
    $("payLabel").textContent = lbl;
    $("line1").textContent = `${gen} · ${cap} · ${lbl}`;
    $("totalBig").textContent = fmt(c.total);
    if(c.cuota != null){
      $("cuotaInfo").textContent = `${c.detail}`;
      $("cuotaInfo").style.display = "block";
    } else {
      $("cuotaInfo").style.display = "none";
    }
    $("cilRef").textContent = fmt(c.cilRef);
    $("cuotaRef").textContent = (c.cuota!=null) ? fmt(c.cuota) : "—";
    $("detail").textContent = c.detail;
    renderPay();
    renderPriceTable();
  }

  /* ── COPY ── */
  function oneLineMessage(c){
    const cap = labelCil(cil);
    const p = payLabel();
    const base = `${gen} · ${cap} · ${p} → ${fmt(c.total)}`;
    if(MULT[c.key]) return `${base} (Cuota ${fmt(c.cuota)} x${MULT[c.key]})`;
    if(SPLIT_TOTAL[c.key]) return `${base} (Cuota ${fmt(c.cuota)} x${SPLIT_TOTAL[c.key]})`;
    return base;
  }

  async function copy(){
    const c = compute();
    const text = oneLineMessage(c);
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text); toast("¡Copiado!"); return;
      }
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly","");
      ta.style.cssText = "position:fixed;left:-9999px";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      toast("¡Copiado!");
    }catch{ window.prompt("Copiar:", text); }
  }

  /* ── TOAST ── */
  function toast(msg){
    const t = $("toast"); t.textContent = msg;
    t.classList.add("show");
    setTimeout(()=>t.classList.remove("show"), 1400);
  }

  /* ── PRESUPUESTO ── */
  function openPresupuesto(){
    const modelo = ($("modeloInput")?.value || "").trim();
    const asesor = ($("asesorInput")?.value || "").trim();
    const cliente = ($("clienteInput")?.value || "").trim();
    const obs = ($("obsInput")?.value || "").trim();

    if(!modelo){
      $("modeloInput").classList.add("error");
      $("modeloInput").focus();
      $("validationModal").classList.add("show");
      return;
    }

    const r = DATA[gen][cil];
    const a3n = parseMoney(r.a3), a6n = parseMoney(r.a6), n8n = parseMoney(r.n8), n12n = parseMoney(r.n12);

    const payload = {
      gen, cil,
      vehiculoTitle: modelo,
      asesor: asesor || "—",
      cliente: cliente || "",
      equipo: `${gen.toUpperCase()} – ${labelCil(cil)}`,
      fecha: todayAR(),
      obs: obs || "Validez por tiempo limitado.",
      precioDestacado: fmtBareFromStr(r.efectivo),
      precioLista: fmtBareFromStr(r.lista),
      debito: fmtBareFromStr(r.trf),
      // cuotas con totales
      promo3: fmtBareFromStr(r.a3),
      promo3Total: fmtBare(a3n ? a3n*3 : null),
      cordo6: fmtBareFromStr(r.a6),
      cordo6Total: fmtBare(a6n ? a6n*6 : null),
      naranja6: fmtBareFromStr(r.a6),
      naranja6Total: fmtBare(a6n ? a6n*6 : null),
      naranja8: fmtBareFromStr(r.n8),
      naranja8Total: fmtBare(n8n ? n8n*8 : null),
      naranja12: fmtBareFromStr(r.n12),
      naranja12Total: fmtBare(n12n ? n12n*12 : null),
      cilRef: fmtBareFromStr(r.cilindro),
    };

    const json = JSON.stringify(payload);
    try{ localStorage.setItem("PRESUPUESTO_PAYLOAD", json); }catch(e){}
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const url = "../presupuesto/index.html#data=" + encodeURIComponent(b64);
    window.open(url, "_blank");
  }

  /* ── RESET ── */
  function resetAll(){
    gen="5ta"; cil="14"; mainPay="efectivo"; subPay="a6";
    $("gen5").classList.add("active"); $("gen4").classList.remove("active");
    buildCilSelect();
    $("subPay").classList.remove("show");
    render();
    toast("Reseteado");
  }

  /* ── INIT ── */
  function init(){
    window.addEventListener("error",(e)=>{
      const box=$("fatal");
      if(box){ box.style.display="block"; box.textContent="Error JS: "+(e.message||"desconocido"); }
    });

    $("gen5").onclick = () => { gen="5ta"; $("gen5").classList.add("active"); $("gen4").classList.remove("active"); buildCilSelect(); render(); };
    $("gen4").onclick = () => { gen="4ta"; $("gen4").classList.add("active"); $("gen5").classList.remove("active"); buildCilSelect(); render(); };
    $("cilSelect").onchange = (e) => { cil = e.target.value; render(); };

    $("modeloInput").oninput = () => $("modeloInput").classList.remove("error");

    $("copyBtn").onclick = copy;
    $("copyTop").onclick = copy;
    $("openPresupuesto").onclick = openPresupuesto;
    $("resetBtn").onclick = resetAll;
    $("modalClose").onclick = () => { $("validationModal").classList.remove("show"); $("modeloInput").focus(); };

    buildCilSelect();
    render();
    $("subPay").classList.toggle("show", mainPay==="fin");
    renderSubPay();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
