const API = 'https://jsonplaceholder.typicode.com';

const formBuscar   = document.querySelector('#form-buscar');
const formCrear    = document.querySelector('#form-crear');
const formComentar = document.querySelector('#form-comentar');
const inputUsuario = document.querySelector('#input-usuario');
const inputBuscar  = document.querySelector('#input-buscar');
const selectLimit  = document.querySelector('#select-limit');
const inputTitulo  = document.querySelector('#input-titulo');
const inputCuerpo  = document.querySelector('#input-cuerpo');
const inputPostId  = document.querySelector('#input-postid');
const btnCrear     = document.querySelector('#btn-crear');
const btnComentar  = document.querySelector('#btn-comentar');
const estado       = document.querySelector('#estado');
const lista        = document.querySelector('#lista');
const resultadoGet = document.querySelector('#resultado-get');

// Estado: publicaciones traídas por el último GET (para filtrar sin re-pedir)
let postsActuales = [];

// 1. Petición genérica
async function peticion(url, opciones = {}) {
    const res = await fetch(url, opciones);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    return { status: res.status, datos: await res.json() };
}

// 2. Funciones de interfaz
function crearTarjeta(post, esNuevo = false) {
    const art = document.createElement('article');
    art.className = esNuevo ? 'post nuevo' : 'post';
    art.dataset.id = post.id;

    const h3 = document.createElement('h3');
    h3.textContent = `#${post.id} ${post.title}`;

    const p = document.createElement('p');
    p.textContent = post.body;

    const contComentarios = document.createElement('div');
    contComentarios.className = 'comentarios';
    contComentarios.hidden = true;

    // Clic en la tarjeta (evitando clics sobre los comentarios)
    art.addEventListener('click', (ev) => {
        if (ev.target.closest('.comentarios')) return;
        cargarComentarios(post.id, contComentarios);
    });

    art.append(h3, p, contComentarios);
    return art;
}

function mostrarEstado(texto, esError = false) {
    estado.textContent = texto;
    estado.className = esError ? 'error' : '';
}

// Actividad 2: GET /posts/{id}/comments y renderizar debajo de la tarjeta
async function cargarComentarios(postId, contenedor) {
    if (contenedor.dataset.cargado === 'true') {
        contenedor.hidden = !contenedor.hidden;
        return;
    }
    mostrarEstado(`GET /posts/${postId}/comments ...`);
    try {
        const { status, datos } = await peticion(`${API}/posts/${postId}/comments`);
        contenedor.replaceChildren();
        if (datos.length === 0) {
            const vacio = document.createElement('p');
            vacio.textContent = 'Sin comentarios.';
            contenedor.append(vacio);
        } else {
            datos.forEach(c => {
                const div = document.createElement('div');
                div.className = 'comentario';
                const nombre = document.createElement('strong');
                nombre.textContent = c.name;
                const mail = document.createElement('small');
                mail.textContent = c.email;
                const cuerpo = document.createElement('p');
                cuerpo.textContent = c.body;
                div.append(nombre, mail, cuerpo);
                contenedor.append(div);
            });
        }
        contenedor.dataset.cargado = 'true';
        contenedor.hidden = false;
        mostrarEstado(`GET ${status}: ${datos.length} comentarios del post ${postId}`);
    } catch (error) {
        mostrarEstado(error.message, true);
    }
}

// Actividad 2: filtro por título en el navegador
function renderizarLista() {
    const texto = inputBuscar.value.trim().toLowerCase();
    const filtrados = texto
        ? postsActuales.filter(p => p.title.toLowerCase().includes(texto))
        : postsActuales;
    lista.replaceChildren(...filtrados.map(p => crearTarjeta(p)));
}

// 3. GET: listar publicaciones con _limit dinámico
formBuscar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
        userId: inputUsuario.value,
        _limit: selectLimit.value
    });
    mostrarEstado('Cargando...');
    try {
        const { status, datos } = await peticion(`${API}/posts?${params}`);
        postsActuales = datos;
        renderizarLista();
        mostrarEstado(`GET ${status}: ${datos.length} publicaciones`);
    } catch (error) {
        mostrarEstado(error.message, true);
    }
});

// Al escribir en el filtro se re-renderiza sin volver a pedir
inputBuscar.addEventListener('input', renderizarLista);

// 4. POST: crear publicación con validación
formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = inputTitulo.value.trim();
    const cuerpo = inputCuerpo.value.trim();

    // Actividad 3: validación antes de enviar
    if (titulo.length < 5) {
        mostrarEstado('El título debe tener al menos 5 caracteres.', true);
        inputTitulo.focus();
        return;
    }
    if (cuerpo.length === 0) {
        mostrarEstado('El contenido no puede estar vacío.', true);
        inputCuerpo.focus();
        return;
    }

    const nuevo = {
        title: titulo,
        body: cuerpo,
        userId: Number(inputUsuario.value)
    };

    btnCrear.disabled = true;                // evita envíos duplicados
    mostrarEstado('Enviando POST...');
    try {
        const { status, datos } = await peticion(`${API}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevo)
        });
        lista.prepend(crearTarjeta(datos, true));
        mostrarEstado(`POST ${status}: creada con id ${datos.id}`);
        formCrear.reset();
    } catch (error) {
        mostrarEstado(error.message, true);
    } finally {
        btnCrear.disabled = false;
    }
});

// 5. Actividad 3: POST /comments usando FormData + Object.fromEntries
formComentar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datos   = new FormData(formComentar);
    const objeto  = Object.fromEntries(datos);

    if (!objeto.name.trim() || !objeto.email.trim() || !objeto.body.trim()) {
        mostrarEstado('Complete todos los campos del comentario.', true);
        return;
    }

    const payload = {
        postId: Number(objeto.postId),
        name:   objeto.name.trim(),
        email:  objeto.email.trim(),
        body:   objeto.body.trim()
    };

    btnComentar.disabled = true;
    mostrarEstado('Enviando comentario (POST)...');
    try {
        const { status, datos: creado } = await peticion(`${API}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        mostrarEstado(`POST ${status}: comentario creado con id ${creado.id}`);
        formComentar.reset();
    } catch (error) {
        mostrarEstado(error.message, true);
    } finally {
        btnComentar.disabled = false;
    }
});

// Actividad 1: leer parámetros GET de la URL actual (formulario method="get")
const query = new URLSearchParams(location.search);
if (query.toString()) {
    const partes = [];
    for (const [clave, valor] of query) partes.push(`${clave} = "${valor}"`);
    resultadoGet.textContent = 'Parámetros recibidos por GET: ' + partes.join(', ');
}

// 6. Carga inicial
formBuscar.requestSubmit();
