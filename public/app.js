const API = '/';
const lista = document.getElementById('lista');

document.getElementById('crear').onclick = async () => {
  const payload = {
    titulo: document.getElementById('titulo').value,
    autor: document.getElementById('autor').value,
    anio: parseInt(document.getElementById('anio').value) || null,
    isbn: document.getElementById('isbn').value,
    descripcion: document.getElementById('descripcion').value
  };
  const res = await fetch(API + 'libros', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    alert('Libro agregado');
    buscar();
  } else {
    const e = await res.json();
    alert('Error: ' + (e.error || res.status));
  }
};

document.getElementById('buscar').onclick = buscar;

async function buscar() {
  const q = document.getElementById('q').value.trim();
  const url = API + 'libros' + (q ? '?search='+encodeURIComponent(q) : '');
  const res = await fetch(url);
  const items = await res.json();
  lista.innerHTML = '';
  if (!items || items.length === 0) {
    lista.innerHTML = '<div>No hay resultados</div>';
    return;
  }
  for (const b of items) {
    const div = document.createElement('div');
    div.className = 'book';
    div.innerHTML = `<strong>${b.titulo}</strong> — ${b.autor} (${b.anio || '-'})<br>${b.descripcion || ''}<br>
      <button data-id="${b.id}" class="del">Eliminar</button>
      <button data-id="${b.id}" class="toggle">Cambiar disponibilidad</button>`;
    lista.appendChild(div);
  }
  // listeners
  document.querySelectorAll('.del').forEach(btn => btn.onclick = async (e) => {
    const id = e.target.dataset.id;
    if (!confirm('Eliminar?')) return;
    await fetch(API + 'libros/' + id, { method: 'DELETE' });
    buscar();
  });
  document.querySelectorAll('.toggle').forEach(btn => btn.onclick = async (e) => {
    const id = e.target.dataset.id;
    // obtener estado actual
    const r = await fetch(API + 'libros/' + id); const b = await r.json();
    await fetch(API + 'libros/' + id, {
      method: 'PATCH',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ disponible: b.disponible ? 0 : 1 })
    });
    buscar();
  });
}
