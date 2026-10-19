/* ============================================================
   PokeDuckParty API — Backend con MongoDB
   ------------------------------------------------------------
   Guarda las confirmaciones (RSVP) en MongoDB. Rápido, estable
   y con CORS correctos: el navegador (móvil o desktop) habla
   directo con esta API sin trucos.

   Endpoints:
     GET  /           -> salud
     GET  /list       -> lista pública (sin mensajes privados)
     POST /rsvp       -> registrar confirmación
     POST /claim      -> marcar poción canjeada
     GET  /admin/guests?token=XXX -> lista COMPLETA (privada)

   Variables de entorno (Railway):
     MONGODB_URI  -> cadena de conexión de Mongo (la da el plugin)
     ADMIN_TOKEN  -> contraseña para ver el panel de admin
     PORT         -> lo asigna Railway solo
   ============================================================ */

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pokeduckparty";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "cambia-esto";

/* ---------- Modelo de datos ---------- */
const guestSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    attendees: { type: Number, default: 1, min: 1, max: 20 },
    fav: { type: String, default: "", trim: true, maxlength: 60 },
    message: { type: String, default: "", trim: true, maxlength: 500 }, // PRIVADO
    potion: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Guest = mongoose.model("Guest", guestSchema);

/* ---------- Conexión a Mongo ---------- */
let dbReady = false;
mongoose.connect(MONGODB_URI)
    .then(function () { dbReady = true; console.log("MongoDB conectado"); })
    .catch(function (err) { console.error("Error conectando a MongoDB:", err.message); });

function ensureDb(res) {
    if (dbReady) return true;
    res.status(503).json({ ok: false, error: "Base de datos no disponible aún. Intenta de nuevo." });
    return false;
}

/* ---------- Salud ---------- */
app.get("/", function (req, res) {
    res.json({ ok: true, service: "pokeduckparty-api", db: dbReady });
});

/* ---------- GET /list -> lista pública (sin mensaje privado) ---------- */
app.get("/list", async function (req, res) {
    if (!ensureDb(res)) return;
    try {
        const docs = await Guest.find({}, "name attendees fav potion").sort({ createdAt: 1 }).lean();
        const guests = docs.map(function (g) {
            return {
                name: g.name,
                attendees: String(g.attendees || 1),
                fav: g.fav || "",
                potion: !!g.potion
            };
        });
        res.json({ ok: true, guests: guests });
    } catch (e) {
        res.status(500).json({ ok: false, error: "No se pudo leer la lista" });
    }
});

/* ---------- POST /rsvp -> registrar confirmación ---------- */
app.post("/rsvp", async function (req, res) {
    if (!ensureDb(res)) return;
    try {
        const b = req.body || {};
        const name = String(b.name || "").trim();
        if (!name) return res.status(400).json({ ok: false, error: "Falta el nombre" });

        let attendees = parseInt(b.attendees, 10);
        if (isNaN(attendees) || attendees < 1) attendees = 1;
        if (attendees > 20) attendees = 20;

        const guest = await Guest.create({
            name: name,
            attendees: attendees,
            fav: String(b.fav || "").trim(),
            message: String(b.message || "").trim(),
            potion: false
        });
        res.json({ ok: true, id: guest._id });
    } catch (e) {
        res.status(500).json({ ok: false, error: "No se pudo registrar" });
    }
});

/* ---------- POST /claim -> marcar poción canjeada ---------- */
app.post("/claim", async function (req, res) {
    if (!ensureDb(res)) return;
    try {
        const name = String((req.body && req.body.name) || "").trim();
        if (!name) return res.status(400).json({ ok: false, error: "Falta el nombre" });

        // Marca la confirmación más reciente de ese nombre.
        const guest = await Guest.findOne({ name: name }).sort({ createdAt: -1 });
        if (!guest) return res.status(404).json({ ok: false, error: "Nombre no encontrado" });

        guest.potion = true;
        await guest.save();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: "No se pudo canjear" });
    }
});

/* ---------- GET /admin/guests -> lista COMPLETA (privada) ---------- */
app.get("/admin/guests", async function (req, res) {
    if (!ensureDb(res)) return;
    const token = req.query.token || req.headers["x-admin-token"];
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).json({ ok: false, error: "No autorizado" });
    }
    try {
        const docs = await Guest.find({}).sort({ createdAt: 1 }).lean();
        const totalPersonas = docs.reduce(function (s, g) { return s + (g.attendees || 1); }, 0);
        res.json({ ok: true, total: docs.length, totalPersonas: totalPersonas, guests: docs });
    } catch (e) {
        res.status(500).json({ ok: false, error: "No se pudo leer" });
    }
});

/* ---------- Panel de admin (página simple) ---------- */
app.get("/admin", function (req, res) {
    res.type("html").send(ADMIN_HTML);
});

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin · PokeDuckParty</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:1.5rem;}
  h1{color:#D4AF37;font-size:1.3rem;}
  input{padding:.5rem .8rem;border-radius:.5rem;border:1px solid #334155;background:#1e293b;color:#fff;}
  button{padding:.5rem 1rem;border-radius:.5rem;border:0;background:#D4AF37;color:#0f172a;font-weight:bold;cursor:pointer;}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.9rem;}
  th,td{text-align:left;padding:.5rem;border-bottom:1px solid #334155;}
  th{color:#94a3b8;font-size:.75rem;text-transform:uppercase;}
  .pill{background:#10b981;color:#042f1e;padding:.1rem .5rem;border-radius:999px;font-size:.7rem;}
  .tot{color:#FFCC03;font-weight:bold;}
  .msg{color:#cbd5e1;font-style:italic;}
</style></head>
<body>
  <h1>🦆⚡ Panel de confirmados</h1>
  <p>Escribe tu token de admin y carga la lista.</p>
  <div><input id="tok" type="password" placeholder="Token de admin" size="30"> <button onclick="load()">Cargar</button></div>
  <p id="summary"></p>
  <div id="out"></div>
<script>
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m];});}
  async function load(){
    var t=document.getElementById("tok").value.trim();
    var out=document.getElementById("out"), sum=document.getElementById("summary");
    out.innerHTML="Cargando..."; sum.textContent="";
    try{
      var r=await fetch("/admin/guests?token="+encodeURIComponent(t));
      var d=await r.json();
      if(!d.ok){ out.innerHTML="<span style='color:#f87171'>"+esc(d.error||"Error")+"</span>"; return; }
      sum.innerHTML="Registros: <span class='tot'>"+d.total+"</span> · Personas: <span class='tot'>"+d.totalPersonas+"</span>";
      var rows=d.guests.map(function(g){
        var fecha=g.createdAt?new Date(g.createdAt).toLocaleString():"";
        return "<tr><td>"+esc(g.name)+"</td><td>"+(g.attendees||1)+"</td><td>"+esc(g.fav||"")+"</td><td class='msg'>"+esc(g.message||"")+"</td><td>"+(g.potion?"<span class='pill'>🍹 sí</span>":"—")+"</td><td>"+esc(fecha)+"</td></tr>";
      }).join("");
      out.innerHTML="<table><thead><tr><th>Nombre</th><th>Personas</th><th>Personaje</th><th>Mensaje (privado)</th><th>Poción</th><th>Fecha</th></tr></thead><tbody>"+rows+"</tbody></table>";
    }catch(e){ out.innerHTML="<span style='color:#f87171'>Error de red</span>"; }
  }
</script>
</body></html>`;

/* ---------- Arranque ---------- */
app.listen(PORT, function () {
    console.log("PokeDuckParty API escuchando en puerto " + PORT);
});
