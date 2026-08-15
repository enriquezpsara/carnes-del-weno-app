import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Datos de arranque
// ---------------------------------------------------------------------------
const CATEGORIAS = [
  { nombre: "Cortes de Res", tipo: "carniceria" },
  { nombre: "Cortes de Cerdo", tipo: "carniceria" },
  { nombre: "Aves", tipo: "carniceria" },
  { nombre: "Embutidos y Quesos", tipo: "supermercado" },
  { nombre: "Abarrotes y Congelados", tipo: "supermercado" },
];
const TIPO_LABEL = { carniceria: "Cámara fría", supermercado: "Anaquel" };

const PRODUCTOS_SEED = [
  { id: "p1", nombre: "Arrachera", categoria: "Cortes de Res", unidad: "kg", stock: 4, minimo: 8, precio: 245 },
  { id: "p2", nombre: "Rib Eye", categoria: "Cortes de Res", unidad: "kg", stock: 11, minimo: 6, precio: 320 },
  { id: "p3", nombre: "T-Bone", categoria: "Cortes de Res", unidad: "kg", stock: 0, minimo: 5, precio: 280 },
  { id: "p4", nombre: "Milanesa de Res", categoria: "Cortes de Res", unidad: "kg", stock: 7, minimo: 5, precio: 190 },
  { id: "p5", nombre: "Diezmillo", categoria: "Cortes de Res", unidad: "kg", stock: 9, minimo: 4, precio: 165 },
  { id: "p6", nombre: "Chuleta Ahumada", categoria: "Cortes de Cerdo", unidad: "kg", stock: 2, minimo: 6, precio: 155 },
  { id: "p7", nombre: "Costilla de Cerdo", categoria: "Cortes de Cerdo", unidad: "kg", stock: 6, minimo: 5, precio: 140 },
  { id: "p8", nombre: "Maciza", categoria: "Cortes de Cerdo", unidad: "kg", stock: 10, minimo: 4, precio: 135 },
  { id: "p9", nombre: "Pollo Entero", categoria: "Aves", unidad: "pza", stock: 3, minimo: 10, precio: 95 },
  { id: "p10", nombre: "Pechuga de Pollo", categoria: "Aves", unidad: "kg", stock: 8, minimo: 6, precio: 110 },
  { id: "p11", nombre: "Alitas", categoria: "Aves", unidad: "kg", stock: 0, minimo: 5, precio: 98 },
  { id: "p12", nombre: "Chorizo", categoria: "Embutidos y Quesos", unidad: "kg", stock: 5, minimo: 4, precio: 120 },
  { id: "p13", nombre: "Longaniza", categoria: "Embutidos y Quesos", unidad: "kg", stock: 1, minimo: 4, precio: 115 },
  { id: "p14", nombre: "Jamón", categoria: "Embutidos y Quesos", unidad: "kg", stock: 6, minimo: 3, precio: 130 },
  { id: "p15", nombre: "Queso Chihuahua", categoria: "Embutidos y Quesos", unidad: "kg", stock: 7, minimo: 3, precio: 145 },
  { id: "p16", nombre: "Aceite Vegetal", categoria: "Abarrotes y Congelados", unidad: "L", stock: 12, minimo: 6, precio: 42 },
  { id: "p17", nombre: "Tortillas de Harina", categoria: "Abarrotes y Congelados", unidad: "paq", stock: 2, minimo: 8, precio: 28 },
  { id: "p18", nombre: "Papas Congeladas", categoria: "Abarrotes y Congelados", unidad: "kg", stock: 9, minimo: 5, precio: 55 },
  { id: "p19", nombre: "Huevo", categoria: "Abarrotes y Congelados", unidad: "caja", stock: 4, minimo: 4, precio: 68 },
];

const USUARIOS_SEED = [
  { id: "u1", nombre: "Carlos Duarte", puesto: "Auxiliar de piso", rol: "operativo" },
  { id: "u2", nombre: "Mariana Félix", puesto: "Auxiliar de piso", rol: "operativo" },
  { id: "u3", nombre: "José Luis Rentería", puesto: "Carnicero", rol: "operativo" },
  { id: "u4", nombre: "Ana Bustamante", puesto: "Cajera", rol: "operativo" },
  { id: "u5", nombre: "Beto Molina", puesto: "Encargado de tienda", rol: "supervisor" },
  { id: "u6", nombre: "Sara Pavlovic", puesto: "Dirección general", rol: "administrador" },
];

const ROL_LABEL = { operativo: "Operativo", supervisor: "Supervisor", administrador: "Administrador" };
const URGENCIA_LABEL = { agotado: "Agotado", bajo: "Stock bajo", insumos: "Insumos" };
const ESTADO_LABEL = {
  pendiente: "Pendiente de validar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  en_orden: "En orden de compra",
  resuelto: "Resuelto",
};

const K = {
  productos: "dw:productos",
  reportes: "dw:reportes",
  ordenes: "dw:ordenes",
  movimientos: "dw:movimientos",
  usuarios: "dw:usuarios",
};
const POLL_MS = 6000;

function estadoStock(p) {
  if (p.stock <= 0) return "agotado";
  if (p.stock <= p.minimo) return "bajo";
  return "bien";
}
function haceTiempo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
function money(n) {
  return `$${Number(n).toLocaleString("es-MX")}`;
}
async function sGet(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

async function sSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("storage set failed", e);
  }
}
function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function App() {
  const [usuarios, setUsuarios] = useState(null);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("inventario");
  const [productos, setProductos] = useState(null);
  const [reportes, setReportes] = useState(null);
  const [ordenes, setOrdenes] = useState(null);
  const [movimientos, setMovimientos] = useState(null);

  const [filtroCat, setFiltroCat] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");
  const [modalReporte, setModalReporte] = useState(null);
  const [nota, setNota] = useState("");
  const [urgencia, setUrgencia] = useState("agotado");
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false);
  const [toast, setToast] = useState(null);
  const pollRef = useRef(null);

  const cargar = useCallback(async () => {
    let u = await sGet(K.usuarios);
    if (!u) { u = USUARIOS_SEED; await sSet(K.usuarios, u); }
    let p = await sGet(K.productos);
    if (!p) { p = PRODUCTOS_SEED; await sSet(K.productos, p); }
    let r = await sGet(K.reportes);
    if (!r) { r = []; await sSet(K.reportes, r); }
    let o = await sGet(K.ordenes);
    if (!o) { o = []; await sSet(K.ordenes, o); }
    let m = await sGet(K.movimientos);
    if (!m) { m = []; await sSet(K.movimientos, m); }
    setUsuarios(u); setProductos(p); setReportes(r); setOrdenes(o); setMovimientos(m);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(cargar, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [user, cargar]);

  function avisar(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  const esOperativo = user?.rol === "operativo";
  const esSupervisor = user?.rol === "supervisor";
  const esAdmin = user?.rol === "administrador";
  const puedeAprobar = esSupervisor || esAdmin;
  const puedeGestionarStock = esSupervisor || esAdmin;

  const tabs = [
    { id: "inventario", label: "Inventario" },
    esOperativo && { id: "mis_reportes", label: "Mis reportes" },
    puedeAprobar && { id: "aprobaciones", label: "Aprobaciones", count: (reportes || []).filter(r => r.estado === "pendiente").length },
    puedeAprobar && { id: "compras", label: "Compras", count: esAdmin ? (ordenes || []).filter(o => o.estado === "pendiente_aprobacion").length : 0 },
    puedeGestionarStock && { id: "movimientos", label: "Movimientos" },
    esAdmin && { id: "usuarios", label: "Usuarios" },
    esAdmin && { id: "analitica", label: "Analítica" },
  ].filter(Boolean);

  // ---- acciones ----
  async function enviarReporte() {
    if (!modalReporte) return;
    const nuevo = {
      id: uid("r"), productoId: modalReporte.id, productoNombre: modalReporte.nombre,
      categoria: modalReporte.categoria, empleado: user.nombre, urgencia, nota: nota.trim(),
      fecha: new Date().toISOString(), estado: "pendiente",
    };
    const act = [nuevo, ...(reportes || [])];
    setReportes(act); await sSet(K.reportes, act);
    setModalReporte(null); setNota(""); setUrgencia("agotado");
    avisar(`Se avisó al supervisor: ${nuevo.productoNombre}`);
  }
  async function decidirReporte(id, decision) {
    const act = reportes.map(r => r.id === id ? { ...r, estado: decision } : r);
    setReportes(act); await sSet(K.reportes, act);
  }
  async function ajustarStock(id, delta) {
    const act = productos.map(p => p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p);
    setProductos(act); await sSet(K.productos, act);
  }
  async function ajustarMinimo(id, delta) {
    const act = productos.map(p => p.id === id ? { ...p, minimo: Math.max(0, p.minimo + delta) } : p);
    setProductos(act); await sSet(K.productos, act);
  }
  async function agregarProducto(nuevo) {
    const act = [...(productos || []), { ...nuevo, id: uid("p") }];
    setProductos(act); await sSet(K.productos, act);
    setModalNuevoProducto(false);
    avisar(`Producto agregado: ${nuevo.nombre}`);
  }
  async function registrarMovimiento(mov) {
    const cantidad = mov.tipo === "merma" ? -Math.abs(mov.cantidad) : Math.abs(mov.cantidad);
    const actProd = productos.map(p => p.id === mov.productoId ? { ...p, stock: Math.max(0, p.stock + cantidad) } : p);
    const nuevoMov = { ...mov, id: uid("m"), usuario: user.nombre, fecha: new Date().toISOString() };
    const actMov = [nuevoMov, ...(movimientos || [])];
    setProductos(actProd); await sSet(K.productos, actProd);
    setMovimientos(actMov); await sSet(K.movimientos, actMov);
    avisar(`Movimiento registrado: ${mov.tipo === "merma" ? "merma" : "entrada"} de ${mov.productoNombre}`);
  }
  async function generarOrden() {
    const aprobados = reportes.filter(r => r.estado === "aprobado");
    if (aprobados.length === 0) return;
    const nueva = { id: uid("o"), items: aprobados, estado: "pendiente_aprobacion", creadaPor: user.nombre, fecha: new Date().toISOString() };
    const actOrd = [nueva, ...(ordenes || [])];
    const actRep = reportes.map(r => aprobados.find(a => a.id === r.id) ? { ...r, estado: "en_orden" } : r);
    setOrdenes(actOrd); await sSet(K.ordenes, actOrd);
    setReportes(actRep); await sSet(K.reportes, actRep);
    avisar(`Orden de compra generada con ${aprobados.length} productos`);
  }
  async function decidirOrden(id, decision) {
    const orden = ordenes.find(o => o.id === id);
    const actOrd = ordenes.map(o => o.id === id ? { ...o, estado: decision, decididaPor: user.nombre } : o);
    const nuevoEstadoItems = decision === "aprobada" ? "resuelto" : "aprobado";
    const actRep = reportes.map(r => orden.items.find(i => i.id === r.id) ? { ...r, estado: nuevoEstadoItems } : r);
    setOrdenes(actOrd); await sSet(K.ordenes, actOrd);
    setReportes(actRep); await sSet(K.reportes, actRep);
  }
  async function agregarUsuario(u) {
    const act = [...(usuarios || []), { ...u, id: uid("u") }];
    setUsuarios(act); await sSet(K.usuarios, act);
  }
  async function quitarUsuario(id) {
    const act = usuarios.filter(u => u.id !== id);
    setUsuarios(act); await sSet(K.usuarios, act);
  }

  const cargando = productos === null || reportes === null || usuarios === null;

  return (
    <div className="app">
      <Estilos />

      {!user ? (
        <Login usuarios={usuarios} onSelect={setUser} />
      ) : (
        <>
          <header className="top">
            <div className="brand-row">
              <div className="marca">
                <div className="diamante"><span>DW</span></div>
                <div>
                  <h1>Del Weno</h1>
                  <span className="sub">Carnicería &amp; Súper · Hermosillo</span>
                </div>
              </div>
              <div className="top-right">
                <span className="user-pill">{user.nombre} · {ROL_LABEL[user.rol]}</span>
                <button className="btn-link" onClick={() => { setUser(null); setView("inventario"); }}>Cambiar usuario</button>
              </div>
            </div>
            <nav className="tabs">
              {tabs.map(t => (
                <button key={t.id} className={`tab-btn ${view === t.id ? "active" : ""}`} onClick={() => setView(t.id)}>
                  {t.label}
                  {!!t.count && <span className="tab-count">{t.count}</span>}
                </button>
              ))}
            </nav>
          </header>

          <main className="content">
            {cargando ? (
              <div className="empty-state">Cargando…</div>
            ) : view === "inventario" ? (
              <VistaInventario
                productos={productos} filtroCat={filtroCat} setFiltroCat={setFiltroCat}
                busqueda={busqueda} setBusqueda={setBusqueda}
                esOperativo={esOperativo} puedeGestionarStock={puedeGestionarStock}
                onReportar={setModalReporte} onAjustarStock={ajustarStock} onAjustarMinimo={ajustarMinimo}
                onAbrirNuevoProducto={() => setModalNuevoProducto(true)}
              />
            ) : view === "mis_reportes" ? (
              <VistaMisReportes reportes={reportes.filter(r => r.empleado === user.nombre)} />
            ) : view === "aprobaciones" ? (
              <VistaAprobaciones reportes={reportes} onDecidir={decidirReporte} />
            ) : view === "compras" ? (
              <VistaCompras reportes={reportes} ordenes={ordenes} esAdmin={esAdmin} esSupervisor={esSupervisor}
                onGenerarOrden={generarOrden} onDecidirOrden={decidirOrden} />
            ) : view === "movimientos" ? (
              <VistaMovimientos productos={productos} movimientos={movimientos} onRegistrar={registrarMovimiento} />
            ) : view === "usuarios" ? (
              <VistaUsuarios usuarios={usuarios} onAgregar={agregarUsuario} onQuitar={quitarUsuario} propioId={user.id} />
            ) : view === "analitica" ? (
              <VistaAnalitica productos={productos} reportes={reportes} />
            ) : null}
          </main>
        </>
      )}

      {modalReporte && (
        <ModalReporte producto={modalReporte} urgencia={urgencia} setUrgencia={setUrgencia}
          nota={nota} setNota={setNota} onCancelar={() => setModalReporte(null)} onEnviar={enviarReporte} />
      )}
      {modalNuevoProducto && (
        <ModalNuevoProducto onCancelar={() => setModalNuevoProducto(false)} onGuardar={agregarProducto} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------------
function Login({ usuarios, onSelect }) {
  if (!usuarios) return <div className="empty-state">Cargando…</div>;
  return (
    <div className="login-wrap">
      <div className="diamante grande"><span>DW</span></div>
      <h1 className="brand-title">Del Weno</h1>
      <p className="brand-sub">Hermosillo, Sonora · Sistema interno de inventario</p>
      <div className="badge-grid">
        {usuarios.map(u => (
          <button key={u.id} className="badge-btn" onClick={() => onSelect(u)}>
            <div className="nombre">{u.nombre}</div>
            <div className="puesto">{u.puesto}</div>
            <span className={`rol-tag ${u.rol}`}>{ROL_LABEL[u.rol]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VistaInventario({ productos, filtroCat, setFiltroCat, busqueda, setBusqueda, esOperativo, puedeGestionarStock, onReportar, onAjustarStock, onAjustarMinimo, onAbrirNuevoProducto }) {
  const filtrados = productos
    .filter(p => filtroCat === "Todos" || p.categoria === filtroCat)
    .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  return (
    <>
      <div className="fila-superior">
        <input className="buscador" placeholder="Buscar producto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        {puedeGestionarStock && <button className="btn-primario" onClick={onAbrirNuevoProducto}>+ Agregar producto</button>}
      </div>
      <div className="filtros">
        <button className={`chip ${filtroCat === "Todos" ? "active" : ""}`} onClick={() => setFiltroCat("Todos")}>Todos</button>
        {CATEGORIAS.map(c => (
          <button key={c.nombre} className={`chip ${filtroCat === c.nombre ? "active" : ""}`} onClick={() => setFiltroCat(c.nombre)}>{c.nombre}</button>
        ))}
      </div>
      <div className="grid-productos">
        {filtrados.map(p => {
          const est = estadoStock(p);
          const label = est === "bien" ? "Stock ok" : est === "bajo" ? "Stock bajo" : "Agotado";
          const catInfo = CATEGORIAS.find(c => c.nombre === p.categoria);
          return (
            <div className="tag-card" key={p.id}>
              <div className="tag-top">
                <span className="tag-eyebrow">{p.categoria}</span>
                <span className="tipo-pill">{TIPO_LABEL[catInfo?.tipo] || ""}</span>
              </div>
              <div className="tag-nombre">{p.nombre}</div>
              <div className={`stamp ${est}`}>{label}</div>
              <div className="tag-stock"><b>{p.stock}</b> {p.unidad} · mínimo {p.minimo} {p.unidad}</div>
              <div className="tag-precio">{money(p.precio)} / {p.unidad}</div>
              <div className="card-actions">
                {esOperativo && <button className="btn-report" onClick={() => onReportar(p)}>Reportar falta</button>}
                {puedeGestionarStock && (
                  <div className="steppers">
                    <div className="stepper">
                      <span className="stepper-label">Stock</span>
                      <button onClick={() => onAjustarStock(p.id, -1)}>−</button>
                      <button onClick={() => onAjustarStock(p.id, 1)}>+</button>
                    </div>
                    <div className="stepper">
                      <span className="stepper-label">Mínimo</span>
                      <button onClick={() => onAjustarMinimo(p.id, -1)}>−</button>
                      <button onClick={() => onAjustarMinimo(p.id, 1)}>+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && <div className="empty-state">No se encontró ningún producto.</div>}
      </div>
    </>
  );
}

function VistaMisReportes({ reportes }) {
  return (
    <div>
      <h2 className="titulo-vista">Mis reportes enviados</h2>
      {reportes.length === 0 && <div className="empty-state">Aún no has reportado ningún faltante.</div>}
      {[...reportes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(r => (
        <div key={r.id} className="reporte-row">
          <div className="reporte-left">
            <div className="prod">{r.productoNombre} <span className={`urgencia-tag ${r.urgencia}`}>{URGENCIA_LABEL[r.urgencia]}</span></div>
            <div className="meta">{r.categoria} · {haceTiempo(r.fecha)}</div>
            {r.nota && <div className="nota">"{r.nota}"</div>}
          </div>
          <span className={`estado-tag ${r.estado}`}>{ESTADO_LABEL[r.estado]}</span>
        </div>
      ))}
    </div>
  );
}

function VistaAprobaciones({ reportes, onDecidir }) {
  const pendientes = reportes.filter(r => r.estado === "pendiente").sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  return (
    <div>
      <h2 className="titulo-vista">Validar avisos de piso</h2>
      {pendientes.length === 0 && <div className="empty-state">No hay avisos pendientes de validar.</div>}
      {pendientes.map(r => (
        <div key={r.id} className="reporte-row">
          <div className="reporte-left">
            <div className="prod">{r.productoNombre} <span className={`urgencia-tag ${r.urgencia}`}>{URGENCIA_LABEL[r.urgencia]}</span></div>
            <div className="meta">{r.categoria} · reportó {r.empleado} · {haceTiempo(r.fecha)}</div>
            {r.nota && <div className="nota">"{r.nota}"</div>}
          </div>
          <div className="acciones-aprobacion">
            <button className="btn-rechazar" onClick={() => onDecidir(r.id, "rechazado")}>Rechazar</button>
            <button className="btn-aprobar" onClick={() => onDecidir(r.id, "aprobado")}>Aprobar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function VistaCompras({ reportes, ordenes, esAdmin, esSupervisor, onGenerarOrden, onDecidirOrden }) {
  const aprobados = reportes.filter(r => r.estado === "aprobado");
  return (
    <div>
      <h2 className="titulo-vista">Reabastecimiento</h2>
      <div className="panel-compras">
        <div>
          <div className="panel-compras-titulo">Aprobados, listos para pedir</div>
          <div className="panel-compras-sub">{aprobados.length} producto(s) validados por supervisión</div>
        </div>
        {(esSupervisor || esAdmin) && (
          <button className="btn-primario" disabled={aprobados.length === 0} onClick={onGenerarOrden}>
            Generar orden de compra
          </button>
        )}
      </div>
      {aprobados.length > 0 && (
        <ul className="lista-simple">
          {aprobados.map(r => <li key={r.id}>{r.productoNombre} — {URGENCIA_LABEL[r.urgencia]}</li>)}
        </ul>
      )}

      <h3 className="subtitulo-vista">Órdenes de compra</h3>
      {(!ordenes || ordenes.length === 0) && <div className="empty-state">Todavía no se ha generado ninguna orden.</div>}
      {[...(ordenes || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(o => (
        <div key={o.id} className="orden-card">
          <div className="orden-header">
            <div>
              <div className="orden-id">Orden · {o.items.length} producto(s)</div>
              <div className="meta">Generada por {o.creadaPor} · {haceTiempo(o.fecha)}</div>
            </div>
            <span className={`estado-tag ${o.estado === "pendiente_aprobacion" ? "pendiente" : o.estado === "aprobada" ? "aprobado" : "rechazado"}`}>
              {o.estado === "pendiente_aprobacion" ? "Espera aprobación" : o.estado === "aprobada" ? "Aprobada" : "Rechazada"}
            </span>
          </div>
          <ul className="lista-simple">
            {o.items.map(i => <li key={i.id}>{i.productoNombre} — {URGENCIA_LABEL[i.urgencia]}</li>)}
          </ul>
          {esAdmin && o.estado === "pendiente_aprobacion" && (
            <div className="acciones-aprobacion">
              <button className="btn-rechazar" onClick={() => onDecidirOrden(o.id, "rechazada")}>Rechazar</button>
              <button className="btn-aprobar" onClick={() => onDecidirOrden(o.id, "aprobada")}>Aprobar orden</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VistaMovimientos({ productos, movimientos, onRegistrar }) {
  const [productoId, setProductoId] = useState(productos[0]?.id || "");
  const [tipo, setTipo] = useState("entrada");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");

  function submit(e) {
    e.preventDefault();
    const prod = productos.find(p => p.id === productoId);
    if (!prod || !cantidad) return;
    onRegistrar({ productoId, productoNombre: prod.nombre, tipo, cantidad: Number(cantidad), motivo: motivo.trim() });
    setCantidad(1); setMotivo("");
  }

  return (
    <div>
      <h2 className="titulo-vista">Entradas y mermas</h2>
      <form className="form-movimiento" onSubmit={submit}>
        <div className="field">
          <label>Producto</label>
          <select value={productoId} onChange={e => setProductoId(e.target.value)}>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.categoria})</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="entrada">Entrada (reabasto)</option>
              <option value="merma">Merma</option>
            </select>
          </div>
          <div className="field">
            <label>Cantidad</label>
            <input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Motivo (opcional)</label>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. caducidad, entrega de proveedor…" />
        </div>
        <button className="btn-primario ancho" type="submit">Registrar movimiento</button>
      </form>

      <h3 className="subtitulo-vista">Historial reciente</h3>
      {(!movimientos || movimientos.length === 0) && <div className="empty-state">Sin movimientos registrados.</div>}
      {(movimientos || []).slice(0, 25).map(m => (
        <div key={m.id} className="mov-row">
          <span className={`mov-tag ${m.tipo}`}>{m.tipo === "entrada" ? "+" : "−"}{Math.abs(m.cantidad)}</span>
          <div className="mov-info">
            <div className="mov-nombre">{m.productoNombre}</div>
            <div className="meta">{m.usuario} · {haceTiempo(m.fecha)}{m.motivo ? ` · ${m.motivo}` : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function VistaUsuarios({ usuarios, onAgregar, onQuitar, propioId }) {
  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");
  const [rol, setRol] = useState("operativo");

  function submit(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onAgregar({ nombre: nombre.trim(), puesto: puesto.trim() || "—", rol });
    setNombre(""); setPuesto("");
  }

  return (
    <div>
      <h2 className="titulo-vista">Personal con acceso</h2>
      <div className="usuarios-lista">
        {usuarios.map(u => (
          <div key={u.id} className="usuario-row">
            <div>
              <div className="nombre">{u.nombre}</div>
              <div className="puesto">{u.puesto}</div>
            </div>
            <div className="usuario-right">
              <span className={`rol-tag ${u.rol}`}>{ROL_LABEL[u.rol]}</span>
              {u.id !== propioId && <button className="btn-quitar" onClick={() => onQuitar(u.id)}>Quitar</button>}
            </div>
          </div>
        ))}
      </div>

      <h3 className="subtitulo-vista">Agregar usuario</h3>
      <form className="form-movimiento" onSubmit={submit}>
        <div className="field"><label>Nombre completo</label><input value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div className="field-row">
          <div className="field"><label>Puesto</label><input value={puesto} onChange={e => setPuesto(e.target.value)} placeholder="Ej. Carnicero" /></div>
          <div className="field">
            <label>Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value)}>
              <option value="operativo">Operativo</option>
              <option value="supervisor">Supervisor</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </div>
        <button className="btn-primario ancho" type="submit">Agregar usuario</button>
      </form>
    </div>
  );
}

function VistaAnalitica({ productos, reportes }) {
  const agotados = productos.filter(p => estadoStock(p) === "agotado").length;
  const bajos = productos.filter(p => estadoStock(p) === "bajo").length;
  const pendientes = reportes.filter(r => r.estado === "pendiente").length;
  const semana = reportes.filter(r => (Date.now() - new Date(r.fecha).getTime()) < 7 * 86400000).length;

  const porCategoria = {};
  reportes.forEach(r => { porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + 1; });
  const maxCat = Math.max(1, ...Object.values(porCategoria));

  return (
    <div>
      <h2 className="titulo-vista">Analítica general</h2>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-num">{productos.length}</div><div className="stat-label">Productos activos</div></div>
        <div className="stat-card alerta"><div className="stat-num">{agotados}</div><div className="stat-label">Agotados ahora</div></div>
        <div className="stat-card advertencia"><div className="stat-num">{bajos}</div><div className="stat-label">Stock bajo</div></div>
        <div className="stat-card"><div className="stat-num">{pendientes}</div><div className="stat-label">Avisos por validar</div></div>
        <div className="stat-card"><div className="stat-num">{semana}</div><div className="stat-label">Reportes esta semana</div></div>
      </div>

      <h3 className="subtitulo-vista">Reportes por categoría</h3>
      {Object.keys(porCategoria).length === 0 && <div className="empty-state">Aún no hay reportes registrados.</div>}
      <div className="barras">
        {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
          <div className="barra-row" key={cat}>
            <span className="barra-label">{cat}</span>
            <div className="barra-fondo"><div className="barra-fill" style={{ width: `${(n / maxCat) * 100}%` }} /></div>
            <span className="barra-num">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modales
// ---------------------------------------------------------------------------
function ModalReporte({ producto, urgencia, setUrgencia, nota, setNota, onCancelar, onEnviar }) {
  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>Reportar falta</h3>
        <div className="sub">{producto.nombre} · {producto.categoria}</div>
        <div className="field">
          <label>Tipo de aviso</label>
          <select value={urgencia} onChange={e => setUrgencia(e.target.value)}>
            <option value="agotado">Agotado</option>
            <option value="bajo">Stock bajo</option>
            <option value="insumos">Insumos</option>
          </select>
        </div>
        <div className="field">
          <label>Nota (opcional)</label>
          <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. ya no queda nada en la cámara fría" />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn-primario" onClick={onEnviar}>Enviar aviso</button>
        </div>
      </div>
    </div>
  );
}

function ModalNuevoProducto({ onCancelar, onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0].nombre);
  const [unidad, setUnidad] = useState("kg");
  const [stock, setStock] = useState(0);
  const [minimo, setMinimo] = useState(1);
  const [precio, setPrecio] = useState(0);

  function submit() {
    if (!nombre.trim()) return;
    onGuardar({ nombre: nombre.trim(), categoria, unidad, stock: Number(stock), minimo: Number(minimo), precio: Number(precio) });
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>Agregar producto</h3>
        <div className="sub">Se agrega al catálogo compartido de inventario</div>
        <div className="field"><label>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Bistec de res" /></div>
        <div className="field">
          <label>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}>
            {CATEGORIAS.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field-row">
          <div className="field"><label>Unidad</label><input value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="kg / pza / paq" /></div>
          <div className="field"><label>Precio</label><input type="number" min="0" value={precio} onChange={e => setPrecio(e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label>Stock inicial</label><input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} /></div>
          <div className="field"><label>Mínimo deseado</label><input type="number" min="0" value={minimo} onChange={e => setMinimo(e.target.value)} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn-primario" onClick={submit}>Guardar producto</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos — paleta Del Weno (amarillo / negro)
// ---------------------------------------------------------------------------
function Estilos() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
      :root {
        --yellow: #FFC629; --yellow-bright: #FFDD66; --yellow-deep: #E8A800;
        --black: #17130F; --charcoal: #2A241D; --paper: #FFFFFF; --cream: #FFF6E0;
        --line: rgba(23,19,15,0.14);
        --red: #B93A2D; --orange: #C97417; --green: #4E7A3D;
      }
      * { box-sizing: border-box; }
      .app { font-family: 'Inter', sans-serif; background: var(--cream); color: var(--black); min-height: 100vh; padding-bottom: 50px;
        background-image: radial-gradient(circle at 1px 1px, rgba(23,19,15,0.05) 1px, transparent 0); background-size: 18px 18px; }
      h1, h2, h3, .display { font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: 0.02em; }
      .mono { font-family: 'DM Mono', monospace; }

      .diamante { width: 52px; height: 52px; background: linear-gradient(160deg, var(--yellow-bright), var(--yellow-deep));
        clip-path: polygon(50% 0%, 100% 35%, 82% 100%, 18% 100%, 0% 35%); display: flex; align-items: center; justify-content: center; }
      .diamante span { font-family: 'Oswald'; font-weight: 700; color: var(--black); font-size: 15px; letter-spacing: 0.03em; }
      .diamante.grande { width: 96px; height: 96px; margin-bottom: 16px; }
      .diamante.grande span { font-size: 26px; }

      /* Login */
      .login-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; background: var(--black); }
      .brand-title { font-size: 30px; text-align: center; color: var(--yellow); margin: 0; }
      .brand-sub { color: #cbbfa4; margin: 4px 0 32px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
      .badge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; width: 100%; max-width: 560px; }
      .badge-btn { background: var(--charcoal); border: 2px solid rgba(255,198,41,0.18); border-radius: 10px; padding: 16px 14px; text-align: left; cursor: pointer; transition: transform .12s, border-color .12s; }
      .badge-btn:hover { border-color: var(--yellow); transform: translateY(-2px); }
      .badge-btn .nombre { font-family: 'Oswald'; font-weight: 600; font-size: 15px; color: var(--paper); text-transform: none; letter-spacing: 0; }
      .badge-btn .puesto { font-size: 12px; color: #b7ab8f; margin-top: 3px; }
      .rol-tag { display: inline-block; margin-top: 8px; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; padding: 2px 9px; border-radius: 999px; }
      .rol-tag.operativo { background: rgba(78,122,61,0.18); color: #8fbf74; }
      .rol-tag.supervisor { background: rgba(255,198,41,0.18); color: var(--yellow); }
      .rol-tag.administrador { background: rgba(185,58,45,0.18); color: #e57e6d; }

      /* Header */
      header.top { background: var(--black); border-bottom: 4px solid var(--yellow); position: sticky; top: 0; z-index: 20; }
      .brand-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; gap: 10px; flex-wrap: wrap; }
      .marca { display: flex; align-items: center; gap: 12px; }
      .marca h1 { font-size: 18px; color: var(--yellow); margin: 0; }
      .marca .sub { display: block; font-family: 'Inter'; text-transform: none; font-size: 11px; letter-spacing: .04em; color: #cbbfa4; margin-top: 2px; }
      .top-right { display: flex; align-items: center; gap: 10px; }
      .user-pill { font-size: 12px; background: rgba(255,198,41,0.14); color: var(--yellow-bright); padding: 6px 12px; border-radius: 999px; }
      .btn-link { background: none; border: none; color: #cbbfa4; text-decoration: underline; font-size: 12px; cursor: pointer; }

      nav.tabs { display: flex; gap: 4px; padding: 0 16px; max-width: 1040px; margin: 0 auto; overflow-x: auto; }
      .tab-btn { font-family: 'Oswald'; font-size: 12.5px; letter-spacing: .03em; padding: 10px 14px; border: none; background: transparent; cursor: pointer; color: #cbbfa4; white-space: nowrap; border-bottom: 3px solid transparent; }
      .tab-btn.active { color: var(--yellow); border-bottom-color: var(--yellow); }
      .tab-count { background: var(--yellow); color: var(--black); font-family: 'Inter'; font-weight: 600; font-size: 10px; border-radius: 999px; padding: 1px 6px; margin-left: 6px; }

      main.content { max-width: 1040px; margin: 0 auto; padding: 20px; }
      .titulo-vista { font-size: 17px; margin: 0 0 14px; }
      .subtitulo-vista { font-size: 14px; margin: 26px 0 12px; color: var(--charcoal); }

      .fila-superior { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
      .buscador { flex: 1; min-width: 180px; border: 1.5px solid var(--line); border-radius: 8px; padding: 10px 12px; font-size: 13px; background: var(--paper); }
      .filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
      .chip { font-size: 12px; padding: 6px 13px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--paper); cursor: pointer; }
      .chip.active { background: var(--black); border-color: var(--black); color: var(--yellow); }

      .grid-productos { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
      .tag-card { background: var(--paper); border: 1.5px solid var(--line); border-radius: 4px 4px 10px 10px; position: relative; padding: 16px 16px 14px; box-shadow: 0 2px 0 rgba(23,19,15,0.05); }
      .tag-card::before { content: ""; position: absolute; top: -7px; left: 50%; transform: translateX(-50%); width: 13px; height: 13px; border-radius: 999px; background: var(--cream); border: 1.5px solid var(--line); }
      .tag-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
      .tag-eyebrow { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: #8a7e68; }
      .tipo-pill { font-size: 9px; background: var(--cream); border: 1px solid var(--line); padding: 2px 7px; border-radius: 999px; letter-spacing: .04em; color: #6b6150; }
      .tag-nombre { font-family: 'Oswald'; font-size: 17px; font-weight: 600; margin: 4px 0 9px; }
      .stamp { display: inline-block; font-family: 'Oswald'; font-size: 11px; letter-spacing: .1em; padding: 4px 10px; border-radius: 3px; border: 2px solid; transform: rotate(-3deg); margin-bottom: 10px; }
      .stamp.bien { color: var(--green); border-color: var(--green); }
      .stamp.bajo { color: var(--orange); border-color: var(--orange); background: rgba(201,116,23,0.08); }
      .stamp.agotado { color: var(--red); border-color: var(--red); background: rgba(185,58,45,0.08); }
      .tag-stock { font-family: 'DM Mono'; font-size: 12.5px; color: #57503f; margin-bottom: 4px; }
      .tag-stock b { color: var(--black); font-size: 14.5px; }
      .tag-precio { font-family: 'DM Mono'; font-size: 12.5px; color: var(--yellow-deep); font-weight: 500; margin-bottom: 12px; }
      .card-actions { display: flex; flex-direction: column; gap: 10px; }
      .btn-report { font-size: 12px; font-weight: 600; color: var(--black); background: var(--yellow); border: none; padding: 9px 12px; border-radius: 6px; cursor: pointer; }
      .btn-report:hover { background: var(--yellow-deep); }
      .steppers { display: flex; gap: 14px; }
      .stepper { display: flex; align-items: center; gap: 5px; }
      .stepper-label { font-size: 10px; color: #8a7e68; text-transform: uppercase; letter-spacing: .04em; margin-right: 2px; }
      .stepper button { width: 24px; height: 24px; border-radius: 6px; border: 1.5px solid var(--line); background: var(--paper); cursor: pointer; font-size: 13px; line-height: 1; }

      .reporte-row { background: var(--paper); border: 1.5px solid var(--line); border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; }
      .reporte-left .prod { font-family: 'Oswald'; font-size: 15px; }
      .reporte-left .meta { font-size: 12px; color: #8a7e68; margin-top: 2px; }
      .reporte-left .nota { font-size: 13px; margin-top: 6px; color: #4a4237; }
      .urgencia-tag { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; padding: 2px 8px; border-radius: 999px; margin-left: 8px; }
      .urgencia-tag.agotado { background: rgba(185,58,45,0.12); color: var(--red); }
      .urgencia-tag.bajo { background: rgba(201,116,23,0.12); color: var(--orange); }
      .urgencia-tag.insumos { background: rgba(23,19,15,0.1); color: var(--charcoal); }
      .estado-tag { font-size: 11px; padding: 5px 10px; border-radius: 999px; white-space: nowrap; height: fit-content; }
      .estado-tag.pendiente { background: rgba(23,19,15,0.08); color: var(--charcoal); }
      .estado-tag.aprobado { background: rgba(78,122,61,0.14); color: var(--green); }
      .estado-tag.rechazado { background: rgba(185,58,45,0.12); color: var(--red); }
      .estado-tag.en_orden { background: rgba(255,198,41,0.2); color: var(--yellow-deep); }
      .estado-tag.resuelto { background: rgba(23,19,15,0.06); color: #8a7e68; }

      .acciones-aprobacion { display: flex; gap: 8px; }
      .btn-aprobar { background: var(--green); color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600; }
      .btn-rechazar { background: var(--paper); border: 1.5px solid var(--line); padding: 8px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }

      .btn-primario { font-size: 12.5px; font-weight: 600; color: var(--black); background: var(--yellow); border: none; padding: 10px 16px; border-radius: 7px; cursor: pointer; }
      .btn-primario:hover { background: var(--yellow-deep); }
      .btn-primario:disabled { opacity: .45; cursor: not-allowed; }
      .btn-primario.ancho { width: 100%; margin-top: 4px; }

      .panel-compras { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 16px; margin-bottom: 12px; flex-wrap: wrap; }
      .panel-compras-titulo { font-family: 'Oswald'; font-size: 14px; }
      .panel-compras-sub { font-size: 12px; color: #8a7e68; margin-top: 2px; }
      .lista-simple { margin: 0 0 4px; padding-left: 18px; font-size: 13px; color: var(--charcoal); }
      .orden-card { background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
      .orden-header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; }
      .orden-id { font-family: 'Oswald'; font-size: 14px; }

      .form-movimiento { background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 18px; max-width: 480px; }
      .field { margin-bottom: 14px; }
      .field label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
      .field select, .field input, .field textarea { width: 100%; border: 1.5px solid var(--line); border-radius: 7px; padding: 9px 10px; font-family: 'Inter'; font-size: 13px; background: white; }
      .field textarea { resize: vertical; min-height: 60px; }
      .field-row { display: flex; gap: 12px; }
      .field-row .field { flex: 1; }

      .mov-row { display: flex; align-items: center; gap: 12px; background: var(--paper); border: 1.5px solid var(--line); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
      .mov-tag { font-family: 'DM Mono'; font-weight: 500; font-size: 13px; padding: 4px 9px; border-radius: 6px; }
      .mov-tag.entrada { background: rgba(78,122,61,0.14); color: var(--green); }
      .mov-tag.merma { background: rgba(185,58,45,0.12); color: var(--red); }
      .mov-nombre { font-family: 'Oswald'; font-size: 13.5px; }
      .meta { font-size: 12px; color: #8a7e68; }

      .usuarios-lista { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
      .usuario-row { background: var(--paper); border: 1.5px solid var(--line); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
      .usuario-row .nombre { font-family: 'Oswald'; font-size: 14px; }
      .usuario-row .puesto { font-size: 12px; color: #8a7e68; }
      .usuario-right { display: flex; align-items: center; gap: 10px; }
      .btn-quitar { background: none; border: none; color: var(--red); font-size: 12px; text-decoration: underline; cursor: pointer; }

      .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 10px; }
      .stat-card { background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 16px; text-align: center; }
      .stat-card.alerta { border-color: rgba(185,58,45,0.4); }
      .stat-card.advertencia { border-color: rgba(201,116,23,0.4); }
      .stat-num { font-family: 'Oswald'; font-size: 26px; }
      .stat-label { font-size: 11px; color: #8a7e68; text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }
      .barras { display: flex; flex-direction: column; gap: 10px; }
      .barra-row { display: grid; grid-template-columns: 150px 1fr 26px; align-items: center; gap: 10px; }
      .barra-label { font-size: 12px; }
      .barra-fondo { background: rgba(23,19,15,0.07); border-radius: 999px; height: 10px; overflow: hidden; }
      .barra-fill { background: var(--yellow); height: 100%; }
      .barra-num { font-family: 'DM Mono'; font-size: 12px; text-align: right; }

      .empty-state { text-align: center; padding: 50px 20px; color: #8a7e68; }

      .modal-overlay { position: fixed; inset: 0; background: rgba(23,19,15,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
      .modal-box { background: var(--paper); border-radius: 10px; padding: 24px; width: 100%; max-width: 400px; border-top: 5px solid var(--yellow); max-height: 90vh; overflow-y: auto; }
      .modal-box h3 { font-size: 18px; margin: 0 0 4px; }
      .modal-box .sub { font-size: 12px; color: #8a7e68; margin-bottom: 16px; }
      .modal-actions { display: flex; gap: 8px; margin-top: 18px; }
      .btn-secondary { flex: 1; padding: 10px; border-radius: 7px; border: 1.5px solid var(--line); background: white; cursor: pointer; font-size: 13px; }
      .modal-actions .btn-primario { flex: 1; }

      .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--black); color: var(--yellow-bright); padding: 12px 18px; border-radius: 8px; font-size: 13px; z-index: 60; box-shadow: 0 6px 20px rgba(0,0,0,.3); }

      @media (max-width: 480px) {
        main.content { padding: 14px; }
        .barra-row { grid-template-columns: 100px 1fr 22px; }
      }
    `}</style>
  );
}
