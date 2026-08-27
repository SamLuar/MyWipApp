const apiBase = '/api/projects';
const hoursApiBase = '/api/hours';
const STORAGE_PROJECTS_KEY = 'wip-projects';
const STORAGE_HOURS_KEY = 'wip-hours';
let currentCategory = null;

const CATEGORIES = ['Ponto Cruz', 'Diamond Painting', 'Patterns', 'Outros'];
const CATEGORY_IMAGES = {
  'Ponto Cruz': 'https://i.pinimg.com/1200x/32/6c/fe/326cfeda5ac0cb0927aa8ce84aeda706.jpg',
  'Diamond Painting': 'https://www.lastijerasmagicas.com/72333-large_default/kit-de-diamond-painting-tarjeta-de-felicitacion-baby-unicorn-diamond-dotz.jpg',
  'Patterns': 'https://i.pinimg.com/736x/63/16/4e/63164e3e3b997ed62f60d63a964e2cb7.jpg',
  'Outros': 'https://i.pinimg.com/736x/e6/64/5c/e6645c8e36214faeaebdd71d3d100b47.jpg'
};
const STATUS_LABELS = {
  'Planned': 'Em Espera',
  'In Progress': 'Em Progresso',
  'Done': 'Terminado',
  'Cancelled': 'Cancelado'
};

const DEFAULT_PROJECTS = [
  {
    "id": "1786798792613",
    "title": "DD6.029 Green Eyed Beauty",
    "description": "Gato laranja de olhos verdes by DOTZ",
    "category": "Diamond Painting",
    "image": "https://eu.diamonddotz.com/image/cache/catalog/products/main/dd6/dd6.029-1600x1600.jpg",
    "status": "Planned",
    "startDate": null,
    "endDate": null,
    "numPoints": "11904",
    "dimensionsCm": "27 x 35 cm",
    "dimensionsPoints": "96 x 124",
    "numColors": "31",
    "acquisitionDate": null,
    "completion": 0,
    "costs": null,
    "forSale": false
  },
  {
    "id": "013",
    "title": "DD6.029 Green Eyed Beauty",
    "description": "Gato laranja de olhos verdes by DOTZ",
    "category": "Patterns",
    "image": "https://eu.diamonddotz.com/image/cache/catalog/products/main/dd6/dd6.029-1600x1600.jpg",
    "status": "In Progress",
    "startDate": "2026-08-10",
    "endDate": null,
    "numPoints": "11904",
    "dimensionsCm": null,
    "dimensionsPoints": "96 x 124",
    "numColors": "31",
    "acquisitionDate": null,
    "completion": 25,
    "costs": {
      "materiais": 1,
      "transporte": 0,
      "moldura": 0,
      "outros": 0
    },
    "forSale": false,
    "notes": ""
  }
];

const DEFAULT_HOURS = {
  "Diamond Painting": {},
  "Patterns": {
    "013": [
      {
        "id": "1786799000000",
        "date": "2026-08-10",
        "startTime": "14:00",
        "duration": 60,
        "pointsDone": 2976,
        "totalPoints": 2976,
        "percentage": 25
      }
    ]
  }
};

function el(tag, cls){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

// Resolução segura de URLs para GitHub Pages e localhost
function getAppUrl(path) {
  let href = window.location.href.split('#')[0].split('?')[0];
  if (!href.endsWith('/')) {
    if (href.substring(href.lastIndexOf('/')).includes('.')) {
      href = href.substring(0, href.lastIndexOf('/') + 1);
    } else {
      href = href + '/';
    }
  }
  const cleanPath = path.replace(/^\.?\//, '');
  return new URL(cleanPath, href).href;
}

// Data helpers para persistência local e fallback
async function loadInitialProjectsFromFile() {
  try {
    const res = await fetch(getAppUrl('data/projects.json'));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.warn('Could not load data/projects.json from network:', e);
  }
  return DEFAULT_PROJECTS;
}

async function loadInitialHoursFromFile() {
  try {
    const res = await fetch(getAppUrl('data/hours.json'));
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {
    console.warn('Could not load data/hours.json from network:', e);
  }
  return DEFAULT_HOURS;
}

function getLocalProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading localStorage projects:', e);
  }
  return null;
}

function setLocalProjects(projects) {
  try {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving projects to localStorage:', e);
  }
}

function getLocalHours() {
  try {
    const raw = localStorage.getItem(STORAGE_HOURS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('Error reading localStorage hours:', e);
  }
  return null;
}

function setLocalHours(hours) {
  try {
    localStorage.setItem(STORAGE_HOURS_KEY, JSON.stringify(hours));
  } catch (e) {
    console.error('Error saving hours to localStorage:', e);
  }
}

async function fetchProjects() {
  // 1. Tentar localStorage primeiro para resposta instantânea
  const localData = getLocalProjects();
  if (localData !== null && localData.length > 0) {
    return localData;
  }

  // 2. Se for localhost/servidor node, tenta API
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      const res = await fetch(apiBase);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLocalProjects(data);
            return data;
          }
        }
      }
    } catch (err) {
      console.info('API backend indisponível, a usar dados locais.');
    }
  }

  // 3. Fallback inicial para data/projects.json ou defaults
  const fileData = await loadInitialProjectsFromFile();
  setLocalProjects(fileData);
  return fileData;
}

async function saveProject(data, id) {
  let projects = await fetchProjects();
  if (id) {
    const idx = projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...data, id };
    } else {
      projects.push({ ...data, id });
    }
  } else {
    const newProject = {
      ...data,
      id: Date.now().toString(),
      hourLog: []
    };
    projects.push(newProject);
  }
  setLocalProjects(projects);
  markDataChanged();

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      if (id) {
        await fetch(`${apiBase}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        await fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }
    } catch (e) {
      console.info('Sincronização com API ignorada.');
    }
  }
}

async function removeProject(id) {
  let projects = await fetchProjects();
  projects = projects.filter(p => p.id !== id);
  setLocalProjects(projects);
  markDataChanged();

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      await fetch(`${apiBase}/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.info('Eliminação na API ignorada.');
    }
  }

  if (currentCategory) navigateToCategory(currentCategory);
}

function showHome(){
  currentCategory = null;
  const homeEl = document.getElementById('home');
  const catViewEl = document.getElementById('category-view');
  if (homeEl) homeEl.classList.remove('hidden');
  if (catViewEl) catViewEl.classList.add('hidden');
  const mainNav = document.getElementById('main-nav');
  if (mainNav) mainNav.innerHTML = '';
}

function showCategoryView(category, projects){
  currentCategory = category;
  const homeEl = document.getElementById('home');
  const catViewEl = document.getElementById('category-view');
  if (homeEl) homeEl.classList.add('hidden');
  if (catViewEl) catViewEl.classList.remove('hidden');

  const categoryTitle = document.getElementById('category-title');
  if (categoryTitle) categoryTitle.textContent = category;

  const banner = document.getElementById('category-banner');
  const bannerTitle = document.getElementById('category-banner-title');
  if (banner) {
    const image = CATEGORY_IMAGES[category] || '';
    banner.style.backgroundImage = image ? `url('${image}')` : 'none';
  }
  if (bannerTitle) {
    bannerTitle.textContent = category;
  }

  renderCategoryNav(category);
  renderAccordions(category, Array.isArray(projects) ? projects : []);
}

function ensureCategoryNavStyles() {
  if (document.getElementById('category-nav-styles')) return;
  const style = document.createElement('style');
  style.id = 'category-nav-styles';
  style.textContent = `
    .category-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .category-nav button {
      padding: 6px 14px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: #ffffff;
      color: #24292f;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .category-nav button:hover:not(.active) {
      background: #f3f4f6;
      border-color: #cbd5e1;
    }
    .category-nav button.active {
      background: #0064c8 !important;
      color: #ffffff !important;
      border-color: #004b96 !important;
      font-weight: 700;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.3);
      cursor: default;
      transform: translateY(1px);
    }
    body.dark-mode .category-nav button {
      background: #1d2735;
      color: #e8edf5;
      border-color: #3a485d;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    body.dark-mode .category-nav button:hover:not(.active) {
      background: #243041;
      border-color: #4f637f;
    }
    body.dark-mode .category-nav button.active {
      background: #0064c8 !important;
      color: #ffffff !important;
      border-color: #8ab4ff !important;
      box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
    }
  `;
  document.head.appendChild(style);
}

function renderCategoryNav(current){
  ensureCategoryNavStyles();
  const nav = document.getElementById('category-nav');
  if (!nav) return;
  nav.innerHTML = '';
  CATEGORIES.forEach(c => {
    const isCurrent = (c === current);
    const b = el('button', isCurrent ? 'category-nav-btn active' : 'category-nav-btn');
    b.textContent = c;
    if (isCurrent) {
      b.setAttribute('aria-current', 'page');
      b.setAttribute('aria-pressed', 'true');
    } else {
      b.onclick = () => navigateToCategory(c);
    }
    nav.appendChild(b);
  });
}

function renderAccordions(category, projects){
  const list = Array.isArray(projects) ? projects : [];
  const grouped = { 'Planned': [], 'In Progress': [], 'Done': [], 'Cancelled': [] };
  
  list.filter(p => (p.category || '') === category).forEach(p => {
    const s = p.status || 'Planned';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(p);
  });

  const populatedStatuses = Object.keys(grouped).filter(status => grouped[status].length > 0);
  const defaultExpandedStatus = grouped['In Progress'].length > 0
    ? 'In Progress'
    : (populatedStatuses[0] || 'Planned');

  Object.keys(grouped).forEach(status => {
    const id = 'status-' + status.replace(/\s+/g,'-');
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    
    if (grouped[status].length === 0) {
      const emptyMsg = el('p', 'empty-status-msg');
      emptyMsg.textContent = 'Sem projetos neste estado';
      emptyMsg.style.color = '#888';
      emptyMsg.style.fontStyle = 'italic';
      emptyMsg.style.padding = '8px';
      container.appendChild(emptyMsg);
    } else {
      grouped[status].forEach(p => container.appendChild(renderProjectCard(p)));
    }

    const accordion = container.parentElement;
    const btn = accordion.querySelector('.accordion-toggle');
    const count = grouped[status].length;
    const statusLabel = STATUS_LABELS[status] || status;
    const isExpanded = status === defaultExpandedStatus;
    accordion.classList.toggle('collapsed', !isExpanded);
    const icon = isExpanded ? '▼' : '▶';
    btn.innerHTML = `<span class="accordion-count">(${count})</span> ${statusLabel} <span class="accordion-icon">${icon}</span>`;
  });

  // Configurar toggles dos accordions
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const accordion = btn.parentElement;
      accordion.classList.toggle('collapsed');
      const isCollapsed = accordion.classList.contains('collapsed');
      const icon = isCollapsed ? '▶' : '▼';
      const countSpan = btn.querySelector('.accordion-count');
      const status = accordion.dataset.status;
      const statusLabel = STATUS_LABELS[status] || status || 'Estado';
      const countHTML = countSpan ? countSpan.outerHTML : '';
      btn.innerHTML = `${countHTML} ${statusLabel} <span class="accordion-icon">${icon}</span>`;
    };
  });
}

function renderProjectCard(p){
  const card = el('div','proj-card');
  const img = el('img','proj-img');
  img.src = p.image || 'https://via.placeholder.com/240x160?text=Sem+Imagem';
  img.alt = p.title || 'Projeto';
  const title = el('h3');
  title.textContent = p.title || 'Sem Título';
  const completion = el('div','proj-completion');
  completion.textContent = `${p.completion || 0}%`;
  card.appendChild(img);
  card.appendChild(title);
  card.appendChild(completion);
  card.onclick = () => showDetails(p);
  return card;
}

function showDetails(p){
  const modal = document.getElementById('detail-modal');
  const body = document.getElementById('detail-body');
  body.innerHTML = '';
  
  // Título
  const title = el('h2');
  title.textContent = p.title;
  body.appendChild(title);
  
  // Imagem
  const img = el('img','detail-img'); 
  img.src = p.image || 'https://via.placeholder.com/480x320?text=Sem+Imagem';
  img.alt = p.title;
  body.appendChild(img);
  
  // Descrição
  if (p.description) {
    const desc = el('p');
    desc.textContent = p.description;
    body.appendChild(desc);
  }

  if (p.category === 'Outros' && p.notes) {
    const notes = el('div','field');
    notes.innerHTML = `<strong>Notas:</strong><br>${p.notes}`;
    body.appendChild(notes);
  }
  
  // Detalhes em grid
  const details = el('div','detail-fields');
  
  if (p.category) {
    const field = el('div','field');
    field.innerHTML = `<strong>Categoria:</strong> ${p.category}`;
    details.appendChild(field);
  }
  if (p.status) {
    const field = el('div','field');
    field.innerHTML = `<strong>Estado:</strong> ${STATUS_LABELS[p.status] || p.status}`;
    details.appendChild(field);
  }
  if (p.numPoints) {
    const field = el('div','field');
    field.innerHTML = `<strong>Pontos/Diamonds:</strong> ${p.numPoints}`;
    details.appendChild(field);
  }
  if (p.dimensionsCm) {
    const field = el('div','field');
    field.innerHTML = `<strong>Medidas:</strong> ${p.dimensionsCm} cm`;
    details.appendChild(field);
  }
  if (p.dimensionsPoints) {
    const field = el('div','field');
    field.innerHTML = `<strong>Tamanho (pontos):</strong> ${p.dimensionsPoints}`;
    details.appendChild(field);
  }
  if (p.numColors) {
    const field = el('div','field');
    field.innerHTML = `<strong>Cores:</strong> ${p.numColors}`;
    details.appendChild(field);
  }
  if (p.acquisitionDate) {
    const field = el('div','field');
    field.innerHTML = `<strong>Data Aquisição:</strong> ${p.acquisitionDate}`;
    details.appendChild(field);
  }
  if (p.startDate) {
    const field = el('div','field');
    field.innerHTML = `<strong>Data Início:</strong> ${p.startDate}`;
    details.appendChild(field);
  }
  if (p.endDate) {
    const field = el('div','field');
    field.innerHTML = `<strong>Data Fim:</strong> ${p.endDate}`;
    details.appendChild(field);
  }
  if (p.completion !== undefined && p.completion !== null) {
    const field = el('div','field');
    field.innerHTML = `<strong>Conclusão:</strong> ${p.completion}%`;
    details.appendChild(field);
  }
  if (p.costs && typeof p.costs === 'object') {
    const field = el('div','field');
    const costs = p.costs;
    const items = [
      costs.materiais !== undefined ? `Materiais: ${Number(costs.materiais).toFixed(2)} €` : null,
      costs.transporte !== undefined ? `Transporte: ${Number(costs.transporte).toFixed(2)} €` : null,
      costs.moldura !== undefined ? `Moldura: ${Number(costs.moldura).toFixed(2)} €` : null,
      costs.outros !== undefined ? `Outros: ${Number(costs.outros).toFixed(2)} €` : null
    ].filter(Boolean).join('<br>');
    const totalCost = (costs.materiais || 0) + (costs.transporte || 0) + (costs.moldura || 0) + (costs.outros || 0);
    field.innerHTML = `<strong>Custos: ${Number(totalCost).toFixed(2)} €</strong><br>${items}`;
    details.appendChild(field);
  }
  if (p.forSale !== undefined && p.forSale !== null) {
    const field = el('div','field');
    field.innerHTML = `<strong>Para Venda:</strong> ${p.forSale ? 'Sim' : 'Não'}`;
    details.appendChild(field);
  }
  
  body.appendChild(details);
  
  // Registo de Horas - tabela
  const hoursSection = el('div', 'hours-section');
  hoursSection.style.marginTop = '20px';
  hoursSection.style.paddingTop = '20px';
  hoursSection.style.borderTop = '2px solid #eee';
  
  const hoursTitle = el('h3');
  hoursTitle.textContent = 'Registo de Horas';
  hoursTitle.style.marginBottom = '10px';
  hoursSection.appendChild(hoursTitle);
  
  const hoursTable = el('table');
  hoursTable.style.width = '100%';
  hoursTable.style.borderCollapse = 'collapse';
  hoursTable.style.marginBottom = '10px';
  hoursTable.id = 'hours-table-detail';
  
  const thead = el('thead');
  thead.innerHTML = `<tr class="hours-table-head-row">
    <th>Data</th>
    <th>Hora</th>
    <th style="text-align:center">Duração</th>
    <th style="text-align:center">Pontos</th>
    <th style="text-align:center">Total</th>
    <th style="text-align:center">%</th>
    <th style="text-align:center">Ação</th>
  </tr>`;
  hoursTable.appendChild(thead);
  
  const tbody = el('tbody');
  tbody.id = 'hours-tbody-detail';
  hoursTable.appendChild(tbody);
  hoursSection.appendChild(hoursTable);
  
  const addHourBtn = el('button');
  addHourBtn.textContent = '+ Adicionar Registo';
  addHourBtn.style.padding = '8px 16px';
  addHourBtn.style.background = '#0064c8';
  addHourBtn.style.color = 'white';
  addHourBtn.style.border = 'none';
  addHourBtn.style.borderRadius = '4px';
  addHourBtn.style.cursor = 'pointer';
  addHourBtn.onclick = () => openHourFormModal(p.id, p.category);
  hoursSection.appendChild(addHourBtn);
  
  body.appendChild(hoursSection);
  
  // Carregar horas
  loadHoursDetail(p.id);
  
  // Armazenar projeto atual nos data attributes para os botões do header
  modal.dataset.projectId = p.id;
  modal.dataset.projectData = JSON.stringify(p);
  
  modal.classList.remove('hidden');
}

function closeDetail(){
  document.getElementById('detail-modal').classList.add('hidden');
}

function bindBackdropClose(modalId, onClose) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) onClose();
  });
}

// Funções de registo de horas
function openHourFormModal(projectId, category) {
  document.getElementById('hour-id').value = '';
  document.getElementById('hour-project-id').value = projectId;
  document.getElementById('hour-category').value = category;
  document.getElementById('hour-date').valueAsDate = new Date();
  document.getElementById('hour-form').reset();
  document.getElementById('hour-modal-title').textContent = 'Novo Registo de Horas';
  document.getElementById('hour-modal').classList.remove('hidden');
}

function openHourEditModal(projectId, category, hour) {
  document.getElementById('hour-id').value = hour.id;
  document.getElementById('hour-project-id').value = projectId;
  document.getElementById('hour-category').value = category;
  document.getElementById('hour-date').value = hour.date;
  document.getElementById('hour-start-time').value = hour.startTime;
  document.getElementById('hour-duration').value = hour.duration;
  document.getElementById('hour-points-done').value = hour.pointsDone;
  document.getElementById('hour-modal-title').textContent = 'Editar Registo de Horas';
  document.getElementById('hour-modal').classList.remove('hidden');
}

function closeHourModal() {
  document.getElementById('hour-modal').classList.add('hidden');
}

async function getHoursForProject(projectId) {
  // 1. Tentar localStorage ou data/hours.json
  let allHours = getLocalHours();
  if (!allHours) {
    allHours = await loadInitialHoursFromFile();
    setLocalHours(allHours);
  }

  // 2. Se for localhost/servidor node, tenta API
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      const res = await fetch(`${hoursApiBase}/${projectId}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await res.json();
        }
      }
    } catch (e) {}
  }

  const projectHours = [];
  for (const cat in allHours) {
    if (allHours[cat] && allHours[cat][projectId]) {
      projectHours.push(...allHours[cat][projectId]);
    }
  }
  return projectHours;
}

async function saveHourEntry({ projectId, category, date, startTime, duration, pointsDone }, hourId = null) {
  let allHours = getLocalHours();
  if (!allHours) {
    allHours = await loadInitialHoursFromFile();
  }
  if (!allHours[category]) allHours[category] = {};
  if (!allHours[category][projectId]) allHours[category][projectId] = [];

  const projects = await fetchProjects();
  const project = projects.find(p => p.id === projectId);
  const totalTargetPoints = project && project.numPoints ? parseInt(project.numPoints, 10) : 0;

  if (hourId) {
    const idx = allHours[category][projectId].findIndex(h => h.id === hourId);
    if (idx !== -1) {
      allHours[category][projectId][idx] = {
        ...allHours[category][projectId][idx],
        date,
        startTime,
        duration,
        pointsDone
      };
    }
  } else {
    const newEntry = {
      id: Date.now().toString(),
      date,
      startTime,
      duration,
      pointsDone,
      totalPoints: 0,
      percentage: 0
    };
    allHours[category][projectId].push(newEntry);
  }

  // Recalcular totais e percentagens para o projeto
  let runningTotal = 0;
  for (const h of allHours[category][projectId]) {
    runningTotal += (h.pointsDone || 0);
    h.totalPoints = runningTotal;
    h.percentage = totalTargetPoints > 0 ? Math.round((runningTotal / totalTargetPoints) * 100) : 0;
  }
  setLocalHours(allHours);

  // Atualizar progresso do projeto
  const lastEntry = allHours[category][projectId][allHours[category][projectId].length - 1];
  const completionPercentage = lastEntry ? Math.min(lastEntry.percentage, 100) : 0;
  if (project) {
    project.completion = completionPercentage;
    const pIdx = projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) {
      projects[pIdx].completion = completionPercentage;
      setLocalProjects(projects);
    }
  }
  markDataChanged();

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      const url = hourId ? `${hoursApiBase}/${projectId}/${hourId}` : hoursApiBase;
      const method = hourId ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, category, date, startTime, duration, pointsDone })
      });
    } catch (e) {
      console.info('Registo de horas na API ignorado.');
    }
  }
}

async function deleteHourEntry(projectId, hourId) {
  let allHours = getLocalHours();
  if (!allHours) {
    allHours = await loadInitialHoursFromFile();
  }

  const projects = await fetchProjects();
  const project = projects.find(p => p.id === projectId);
  const totalTargetPoints = project && project.numPoints ? parseInt(project.numPoints, 10) : 0;

  for (const cat in allHours) {
    if (allHours[cat] && allHours[cat][projectId]) {
      const idx = allHours[cat][projectId].findIndex(h => h.id === hourId);
      if (idx !== -1) {
        allHours[cat][projectId].splice(idx, 1);

        let runningTotal = 0;
        for (const h of allHours[cat][projectId]) {
          runningTotal += (h.pointsDone || 0);
          h.totalPoints = runningTotal;
          h.percentage = totalTargetPoints > 0 ? Math.round((runningTotal / totalTargetPoints) * 100) : 0;
        }

        setLocalHours(allHours);

        const lastEntry = allHours[cat][projectId][allHours[cat][projectId].length - 1];
        const completionPercentage = lastEntry ? Math.min(lastEntry.percentage, 100) : 0;
        if (project) {
          project.completion = completionPercentage;
          const pIdx = projects.findIndex(p => p.id === projectId);
          if (pIdx !== -1) {
            projects[pIdx].completion = completionPercentage;
            setLocalProjects(projects);
          }
        }
        markDataChanged();
        break;
      }
    }
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    try {
      await fetch(`${hoursApiBase}/${projectId}/${hourId}`, { method: 'DELETE' });
    } catch (e) {
      console.info('Eliminação de hora na API ignorada.');
    }
  }
}

async function loadHoursDetail(projectId) {
  const hours = await getHoursForProject(projectId);
  const tbody = document.getElementById('hours-tbody-detail');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!hours || hours.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px">Sem registos</td></tr>';
    return;
  }
  
  const projects = await fetchProjects();
  const project = projects.find(p => p.id === projectId);
  const category = project?.category || '';
  
  hours.forEach(h => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #eee';
    row.innerHTML = `
      <td style="padding:8px">${h.date || ''}</td>
      <td style="padding:8px">${h.startTime || ''}</td>
      <td style="padding:8px; text-align:center">${h.duration || 0}min</td>
      <td style="padding:8px; text-align:center">${h.pointsDone || 0}</td>
      <td style="padding:8px; text-align:center">${h.totalPoints || 0}</td>
      <td style="padding:8px; text-align:center"><strong>${h.percentage || 0}%</strong></td>
      <td style="padding:8px; text-align:center">
        <button class="edit-hour-detail-btn" data-hour-json="${encodeURIComponent(JSON.stringify(h))}" data-project-id="${projectId}" data-category="${category}" style="background:none; border:none; cursor:pointer; color:blue; margin-right:8px" title="Editar">✎</button>
        <button class="delete-hour-detail-btn" data-hour-id="${h.id}" data-project-id="${projectId}" style="background:none; border:none; cursor:pointer; color:red" title="Eliminar">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Handlers de edição
  tbody.querySelectorAll('.edit-hour-detail-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const hour = JSON.parse(decodeURIComponent(btn.dataset.hourJson));
      const pid = btn.dataset.projectId;
      const cat = btn.dataset.category;
      openHourEditModal(pid, cat, hour);
    };
  });
  
  // Handlers de eliminação
  tbody.querySelectorAll('.delete-hour-detail-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      const hourId = btn.dataset.hourId;
      const pid = btn.dataset.projectId;
      if (confirm('Eliminar este registo?')) {
        await deleteHourEntry(pid, hourId);
        loadHoursDetail(pid);
        const updatedProjects = await fetchProjects();
        const updatedProj = updatedProjects.find(p => p.id === pid);
        if (updatedProj) showDetails(updatedProj);
      }
    };
  });
}

function navigateToCategory(category){
  fetchProjects().then(projects => showCategoryView(category, projects));
}

function openFormModal(){
  toggleNotesField();
  document.getElementById('project-form-modal').classList.remove('hidden');
}

function closeFormModal(){
  document.getElementById('project-form-modal').classList.add('hidden');
}

function formatMoney(value){
  if (value === null || value === undefined || value === '') return '0.00';
  return Number(value).toFixed(2);
}

function getCostsObject(){
  return {
    materiais: Number(parseFloat(document.getElementById('costs-materials').value || 0).toFixed(2)),
    transporte: Number(parseFloat(document.getElementById('costs-transport').value || 0).toFixed(2)),
    moldura: Number(parseFloat(document.getElementById('costs-frame').value || 0).toFixed(2)),
    outros: Number(parseFloat(document.getElementById('costs-other').value || 0).toFixed(2))
  };
}

function fillCostsFields(costs){
  const parsed = costs && typeof costs === 'object' ? costs : {};
  document.getElementById('costs-materials').value = formatMoney(parsed.materiais ?? 0);
  document.getElementById('costs-transport').value = formatMoney(parsed.transporte ?? 0);
  document.getElementById('costs-frame').value = formatMoney(parsed.moldura ?? 0);
  document.getElementById('costs-other').value = formatMoney(parsed.outros ?? 0);
}

function getFormData(){
  const category = document.getElementById('category').value;
  
  return {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    notes: category === 'Outros' ? document.getElementById('notes').value.trim() : '',
    category,
    image: document.getElementById('image').value || null,
    status: document.getElementById('status').value,
    numPoints: document.getElementById('numPoints').value || null,
    dimensionsCm: document.getElementById('dimensionsCm').value || null,
    dimensionsPoints: document.getElementById('dimensionsPoints').value || null,
    numColors: document.getElementById('numColors').value || null,
    acquisitionDate: document.getElementById('acquisitionDate').value || null,
    startDate: document.getElementById('startDate').value || null,
    endDate: document.getElementById('endDate').value || null,
    completion: parseInt(document.getElementById('completion').value, 10) || 0,
    costs: getCostsObject(),
    forSale: document.getElementById('forSale').value === 'true'
  };
}

function toggleNotesField(){
  const category = document.getElementById('category').value;
  const notesField = document.getElementById('notes-field');
  const notesInput = document.getElementById('notes');
  const isOther = category === 'Outros';
  notesField.classList.toggle('hidden', !isOther);
  if (!isOther) notesInput.value = '';
}

function resetForm(){
  document.getElementById('project-id').value = '';
  document.getElementById('project-form').reset();
  fillCostsFields({});
  document.getElementById('form-title').textContent = 'Novo Projecto';
  toggleNotesField();
}

function populateForm(p){
  document.getElementById('project-id').value = p.id;
  document.getElementById('title').value = p.title;
  document.getElementById('description').value = p.description || '';
  document.getElementById('category').value = p.category || CATEGORIES[0];
  document.getElementById('notes').value = p.notes || '';
  toggleNotesField();
  document.getElementById('image').value = p.image || '';
  document.getElementById('status').value = p.status || 'Planned';
  document.getElementById('numPoints').value = p.numPoints || '';
  document.getElementById('dimensionsCm').value = p.dimensionsCm || '';
  document.getElementById('dimensionsPoints').value = p.dimensionsPoints || '';
  document.getElementById('numColors').value = p.numColors || '';
  document.getElementById('acquisitionDate').value = p.acquisitionDate || '';
  document.getElementById('startDate').value = p.startDate || '';
  document.getElementById('endDate').value = p.endDate || '';
  document.getElementById('completion').value = p.completion || 0;
  fillCostsFields(p.costs);
  document.getElementById('forSale').value = p.forSale ? 'true' : 'false';
  document.getElementById('form-title').textContent = 'Editar Projecto';
}

function applyTheme(theme) {
  const body = document.body;
  const isDark = theme === 'dark';
  body.classList.toggle('dark-mode', isDark);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.textContent = isDark ? '🌙' : '☀️';
    toggle.title = isDark ? 'Tema escuro' : 'Tema claro';
  }
  localStorage.setItem('wip-theme', theme);
}

// ==========================================
// MÓDULO DE BACKUP GITHUB (CICLO DE 24 HORAS)
// ==========================================
const BACKUP_CONFIG_KEY = 'wip_github_config';
const BACKUP_LAST_TIME_KEY = 'wip_last_backup_time';
const BACKUP_HAS_CHANGES_KEY = 'wip_has_unbacked_changes';
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

function getGitHubConfig() {
  try {
    const raw = localStorage.getItem(BACKUP_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    owner: 'SamLuar',
    repo: 'MyWipApp',
    branch: 'feat/pwa4Android',
    token: ''
  };
}

function saveGitHubConfig(cfg) {
  localStorage.setItem(BACKUP_CONFIG_KEY, JSON.stringify(cfg));
}

function markDataChanged() {
  localStorage.setItem(BACKUP_HAS_CHANGES_KEY, 'true');
  updateBackupModalUI();
  // Se já passaram 24 horas desde o último backup, aciona imediatamente
  checkAndTrigger24hBackup();
}

function showBackupToast(message, type = 'info') {
  let container = document.getElementById('wip-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'wip-toast-container';
    container.className = 'wip-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `wip-toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 4000);
}

async function commitFileToGitHub(cfg, filePath, fileContent, message) {
  const { owner, repo, branch, token } = cfg;
  const targetBranch = branch || 'main';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(targetBranch)}`;

  // 1. Obter SHA atual do ficheiro
  let sha = null;
  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    }
  } catch (e) {
    console.warn(`Não foi possível obter SHA para ${filePath}:`, e);
  }

  // 2. Converter conteúdo para Base64 UTF-8 de forma segura
  const bytes = new TextEncoder().encode(fileContent);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const contentBase64 = btoa(binary);

  // 3. Fazer PUT com novo commit
  const putBody = {
    message: `${message} (${new Date().toLocaleDateString('pt-PT')})`,
    content: contentBase64,
    branch: targetBranch
  };
  if (sha) {
    putBody.sha = sha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${putRes.status}`);
  }

  return await putRes.json();
}

async function performGitHubBackup(cfg) {
  try {
    showBackupToast('A realizar backup para o GitHub...', 'info');

    const projects = await fetchProjects();
    let allHours = getLocalHours();
    if (!allHours) {
      allHours = await loadInitialHoursFromFile();
    }

    const projectsContent = JSON.stringify(projects, null, 2);
    const hoursContent = JSON.stringify(allHours, null, 2);

    // 1. Commit data/projects.json
    await commitFileToGitHub(cfg, 'data/projects.json', projectsContent, 'backup: auto-sync projects.json [24h]');

    // 2. Commit data/hours.json
    await commitFileToGitHub(cfg, 'data/hours.json', hoursContent, 'backup: auto-sync hours.json [24h]');

    // Atualiza estado do backup
    localStorage.setItem(BACKUP_LAST_TIME_KEY, Date.now().toString());
    localStorage.setItem(BACKUP_HAS_CHANGES_KEY, 'false');

    showBackupToast('✓ Backup para o GitHub concluído com sucesso!', 'success');
    updateBackupModalUI();
    return { success: true };
  } catch (err) {
    console.error('Erro no backup para o GitHub:', err);
    showBackupToast(`Erro no backup GitHub: ${err.message}`, 'error');
    updateBackupModalUI();
    return { success: false, error: err.message };
  }
}

async function checkAndTrigger24hBackup(force = false) {
  const cfg = getGitHubConfig();
  if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
    updateBackupModalUI();
    return { success: false, reason: 'no_token' };
  }

  const hasChanges = localStorage.getItem(BACKUP_HAS_CHANGES_KEY) === 'true';
  const lastBackup = parseInt(localStorage.getItem(BACKUP_LAST_TIME_KEY) || '0', 10);
  const now = Date.now();
  const timeDiff = now - lastBackup;

  if (!force) {
    if (!hasChanges) {
      updateBackupModalUI();
      return { success: true, reason: 'no_changes' };
    }
    // Verifica se já passaram 24 horas
    if (timeDiff < BACKUP_INTERVAL_MS) {
      updateBackupModalUI();
      return { success: true, reason: 'waiting_24h' };
    }
  }

  return await performGitHubBackup(cfg);
}

async function exportBackupJson() {
  const projects = await fetchProjects();
  let hours = getLocalHours();
  if (!hours) hours = await loadInitialHoursFromFile();

  const backupData = {
    exportedAt: new Date().toISOString(),
    projects,
    hours
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mywip-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showBackupToast('Ficheiro de backup JSON exportado com sucesso!', 'success');
}

function importBackupJson(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.projects)) {
        setLocalProjects(data.projects);
      }
      if (data.hours && typeof data.hours === 'object') {
        setLocalHours(data.hours);
      }
      markDataChanged();
      showBackupToast('Dados importados com sucesso!', 'success');
      if (currentCategory) navigateToCategory(currentCategory); else showHome();
    } catch (err) {
      alert('Erro ao ler o ficheiro JSON de backup: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function openBackupModal() {
  const cfg = getGitHubConfig();
  document.getElementById('gh-token').value = cfg.token || '';
  document.getElementById('gh-owner').value = cfg.owner || 'SamLuar';
  document.getElementById('gh-repo').value = cfg.repo || 'MyWipApp';
  document.getElementById('gh-branch').value = cfg.branch || 'feat/pwa4Android';
  updateBackupModalUI();
  document.getElementById('backup-modal').classList.remove('hidden');
}

function closeBackupModal() {
  document.getElementById('backup-modal').classList.add('hidden');
}

function updateBackupModalUI() {
  const statusText = document.getElementById('backup-status-text');
  const lastTimeEl = document.getElementById('backup-last-time');
  const pendingEl = document.getElementById('backup-pending-changes');
  const nextTimeEl = document.getElementById('backup-next-time');
  if (!statusText || !lastTimeEl) return;

  const cfg = getGitHubConfig();
  const hasToken = Boolean(cfg.token && cfg.token.trim());
  const hasChanges = localStorage.getItem(BACKUP_HAS_CHANGES_KEY) === 'true';
  const lastBackup = parseInt(localStorage.getItem(BACKUP_LAST_TIME_KEY) || '0', 10);
  const now = Date.now();
  const timeDiff = now - lastBackup;

  if (!hasToken) {
    statusText.textContent = 'Token GitHub não configurado';
    statusText.style.color = '#e36209';
  } else if (hasChanges) {
    if (timeDiff >= BACKUP_INTERVAL_MS) {
      statusText.textContent = 'Pronto para backup (24h atingidas)';
      statusText.style.color = '#2ea043';
    } else {
      statusText.textContent = 'Alterações gravadas (aguarda ciclo de 24h)';
      statusText.style.color = '#0064c8';
    }
  } else {
    statusText.textContent = 'Sincronizado / Sem alterações pendentes';
    statusText.style.color = '#2ea043';
  }

  if (lastBackup > 0) {
    const d = new Date(lastBackup);
    lastTimeEl.textContent = `${d.toLocaleDateString('pt-PT')} às ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    lastTimeEl.textContent = 'Nunca';
  }

  pendingEl.textContent = hasChanges ? 'Sim' : 'Nenhuma';

  if (hasChanges && hasToken) {
    if (timeDiff >= BACKUP_INTERVAL_MS) {
      nextTimeEl.textContent = 'Imediato (ao próximo ciclo / acione agora)';
    } else {
      const remainingHours = ((BACKUP_INTERVAL_MS - timeDiff) / (1000 * 60 * 60)).toFixed(1);
      nextTimeEl.textContent = `Em ~${remainingHours}h`;
    }
  } else if (!hasChanges && hasToken) {
    nextTimeEl.textContent = '24h após a próxima alteração';
  } else {
    nextTimeEl.textContent = 'Configure o token';
  }
}

function ensureBackupStyles() {
  if (document.getElementById('backup-styles')) return;
  const style = document.createElement('style');
  style.id = 'backup-styles';
  style.textContent = `
    .backup-btn {
      font-size: 1.1rem;
      margin-left: 8px;
      cursor: pointer;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .backup-btn:hover {
      background: #f0f0f0;
    }
    body.dark-mode .backup-btn {
      border-color: #3a485d;
      background: #1d2735;
      color: #e8edf5;
    }
    body.dark-mode .backup-btn:hover {
      background: #243041;
    }

    .wip-toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    .wip-toast {
      pointer-events: auto;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #fff;
      background: #333;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      animation: wipToastFadeIn 0.3s ease;
      transition: opacity 0.3s ease;
      max-width: 340px;
    }
    .wip-toast.toast-success { background: #2ea043; }
    .wip-toast.toast-error { background: #cf222e; }
    .wip-toast.toast-info { background: #0969da; }

    @keyframes wipToastFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .backup-modal-content {
      max-width: 520px;
      width: 92%;
    }
    .backup-status-card {
      background: #f6f8fa;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    body.dark-mode .backup-status-card {
      background: #161b22;
      border-color: #30363d;
    }
    .status-row {
      margin-bottom: 4px;
    }
    .token-input-group {
      display: flex;
      gap: 6px;
    }
    .token-input-group input {
      flex: 1;
    }
    .help-text {
      display: block;
      margin-top: 4px;
      color: #6e7781;
      font-size: 0.8rem;
    }
    body.dark-mode .help-text {
      color: #8b949e;
    }
    .modal-divider {
      border: 0;
      border-top: 1px solid #e1e4e8;
      margin: 14px 0;
    }
    body.dark-mode .modal-divider {
      border-top-color: #30363d;
    }
  `;
  document.head.appendChild(style);
}

function setupBackupUI() {
  ensureBackupStyles();

  // 1. Injetar botão na topbar
  const topbar = document.querySelector('.topbar');
  if (topbar && !document.getElementById('backup-btn')) {
    const backupBtn = document.createElement('button');
    backupBtn.id = 'backup-btn';
    backupBtn.className = 'icon-btn backup-btn';
    backupBtn.title = 'Backup GitHub (24h)';
    backupBtn.textContent = '☁️';
    backupBtn.onclick = openBackupModal;
    topbar.appendChild(backupBtn);
  }

  // 2. Injetar modal de backup no body se não existir
  if (!document.getElementById('backup-modal')) {
    const modal = document.createElement('div');
    modal.id = 'backup-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content backup-modal-content">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h2 style="margin:0; font-size:1.3rem;">Backup GitHub (24h)</h2>
          <button id="backup-modal-close" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <div class="backup-modal-body">
          <div class="backup-status-card">
            <div class="status-row"><strong>Estado:</strong> <span id="backup-status-text">A carregar...</span></div>
            <div class="status-row"><strong>Último Backup:</strong> <span id="backup-last-time">Nunca</span></div>
            <div class="status-row"><strong>Alterações Pendentes:</strong> <span id="backup-pending-changes">Nenhuma</span></div>
            <div class="status-row"><strong>Próximo Backup Automático:</strong> <span id="backup-next-time">--</span></div>
          </div>

          <hr class="modal-divider">

          <h3 style="margin:0 0 10px 0; font-size:1.05rem;">Configuração do Repositório</h3>
          <div class="form-group" style="margin-bottom:10px;">
            <label for="gh-token" style="display:block; font-weight:bold; margin-bottom:4px; font-size:0.9rem;">Personal Access Token (GitHub PAT):</label>
            <div class="token-input-group">
              <input type="password" id="gh-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="width:100%; padding:8px; box-sizing:border-box;">
              <button type="button" id="gh-token-toggle" style="padding:8px 12px; cursor:pointer;" title="Mostrar/Ocultar Token">👁️</button>
            </div>
            <small class="help-text">Token pessoal do GitHub com permissão de escrita de ficheiros (ex: <code>Contents: Write</code> ou <code>repo</code>).</small>
          </div>

          <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
            <div style="flex:1; min-width:130px;">
              <label for="gh-owner" style="display:block; font-weight:bold; margin-bottom:4px; font-size:0.9rem;">Utilizador / Org:</label>
              <input type="text" id="gh-owner" placeholder="SamLuar" style="width:100%; padding:8px; box-sizing:border-box;">
            </div>
            <div style="flex:1; min-width:130px;">
              <label for="gh-repo" style="display:block; font-weight:bold; margin-bottom:4px; font-size:0.9rem;">Repositório:</label>
              <input type="text" id="gh-repo" placeholder="MyWipApp" style="width:100%; padding:8px; box-sizing:border-box;">
            </div>
            <div style="flex:1; min-width:130px;">
              <label for="gh-branch" style="display:block; font-weight:bold; margin-bottom:4px; font-size:0.9rem;">Branch:</label>
              <input type="text" id="gh-branch" placeholder="feat/pwa4Android" style="width:100%; padding:8px; box-sizing:border-box;">
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;">
            <button type="button" id="gh-save-btn" style="background:#0064c8; color:white; padding:8px 14px; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Guardar Configuração</button>
            <button type="button" id="gh-backup-now-btn" style="background:#2ea043; color:white; padding:8px 14px; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">Fazer Backup Agora</button>
            <button type="button" id="gh-export-btn" style="padding:8px 14px; border:1px solid #ccc; border-radius:4px; cursor:pointer;">Exportar JSON</button>
            <button type="button" id="gh-import-btn" style="padding:8px 14px; border:1px solid #ccc; border-radius:4px; cursor:pointer;">Importar JSON</button>
            <input type="file" id="gh-import-file" accept=".json" style="display:none;">
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    bindBackdropClose('backup-modal', closeBackupModal);
    document.getElementById('backup-modal-close').onclick = closeBackupModal;

    // Toggle password
    document.getElementById('gh-token-toggle').onclick = () => {
      const input = document.getElementById('gh-token');
      input.type = input.type === 'password' ? 'text' : 'password';
    };

    // Guardar configurações
    document.getElementById('gh-save-btn').onclick = () => {
      const token = document.getElementById('gh-token').value.trim();
      const owner = document.getElementById('gh-owner').value.trim() || 'SamLuar';
      const repo = document.getElementById('gh-repo').value.trim() || 'MyWipApp';
      const branch = document.getElementById('gh-branch').value.trim() || 'feat/pwa4Android';
      saveGitHubConfig({ token, owner, repo, branch });
      showBackupToast('Configuração de backup guardada!', 'success');
      updateBackupModalUI();
    };

    // Fazer backup imediato
    document.getElementById('gh-backup-now-btn').onclick = async () => {
      const token = document.getElementById('gh-token').value.trim();
      const owner = document.getElementById('gh-owner').value.trim() || 'SamLuar';
      const repo = document.getElementById('gh-repo').value.trim() || 'MyWipApp';
      const branch = document.getElementById('gh-branch').value.trim() || 'feat/pwa4Android';
      saveGitHubConfig({ token, owner, repo, branch });

      if (!token) {
        alert('Insira o seu Personal Access Token do GitHub para realizar o backup.');
        return;
      }
      await performGitHubBackup({ token, owner, repo, branch });
    };

    // Exportar e Importar
    document.getElementById('gh-export-btn').onclick = () => exportBackupJson();
    document.getElementById('gh-import-btn').onclick = () => {
      document.getElementById('gh-import-file').click();
    };
    document.getElementById('gh-import-file').onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        importBackupJson(e.target.files[0]);
        e.target.value = '';
      }
    };
  }

  // Verificação periódica de 24 horas a cada 15 minutos em background
  setInterval(() => {
    checkAndTrigger24hBackup();
  }, 15 * 60 * 1000);

  // Verificação inicial
  checkAndTrigger24hBackup();
}

// Inicialização segura do Service Worker no GitHub Pages
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(getAppUrl('sw.js')).catch((err) => {
      console.warn('Service Worker registration note:', err);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupBackupUI();

  bindBackdropClose('detail-modal', closeDetail);
  bindBackdropClose('project-form-modal', () => { resetForm(); closeFormModal(); });
  bindBackdropClose('hour-modal', closeHourModal);

  const savedTheme = localStorage.getItem('wip-theme') || 'light';
  applyTheme(savedTheme);
  document.getElementById('theme-toggle').onclick = () => {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
  };

  // Cliques nos cartões da página inicial
  document.querySelectorAll('.cards .card').forEach(card => {
    card.onclick = () => {
      const category = card.dataset.category;
      if (category) navigateToCategory(category);
    };
  });

  document.getElementById('back-home').onclick = () => showHome();
  document.getElementById('category').addEventListener('change', toggleNotesField);
  document.getElementById('add-project-btn').onclick = () => { resetForm(); openFormModal(); };

  document.getElementById('detail-close').onclick = () => closeDetail();
  document.getElementById('detail-edit-btn').onclick = () => {
    const modal = document.getElementById('detail-modal');
    const project = JSON.parse(modal.dataset.projectData);
    populateForm(project);
    openFormModal();
    closeDetail();
  };
  document.getElementById('detail-delete-btn').onclick = async () => {
    const modal = document.getElementById('detail-modal');
    if (confirm('Eliminar este projecto?')) {
      await removeProject(modal.dataset.projectId);
      closeDetail();
    }
  };
  document.getElementById('cancel').onclick = (e) => {
    e.preventDefault();
    resetForm();
    closeFormModal();
  };

  document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('project-id').value;
    const data = getFormData();
    await saveProject(data, id);
    closeFormModal();
    if (currentCategory) navigateToCategory(currentCategory); else showHome();
  });

  // Listeners do modal de registo de horas
  document.getElementById('hour-close').onclick = () => closeHourModal();
  document.getElementById('hour-cancel').onclick = (e) => {
    e.preventDefault();
    closeHourModal();
  };
  
  document.getElementById('hour-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hourId = document.getElementById('hour-id').value;
    const projectId = document.getElementById('hour-project-id').value;
    const category = document.getElementById('hour-category').value;
    const date = document.getElementById('hour-date').value;
    const startTime = document.getElementById('hour-start-time').value;
    const duration = parseInt(document.getElementById('hour-duration').value, 10);
    const pointsDone = parseInt(document.getElementById('hour-points-done').value, 10);
    
    if (!date || !startTime || isNaN(duration) || isNaN(pointsDone)) {
      alert('Preencha todos os campos');
      return;
    }
    
    await saveHourEntry({ projectId, category, date, startTime, duration, pointsDone }, hourId);
    document.getElementById('hour-form').reset();
    document.getElementById('hour-date').valueAsDate = new Date();
    closeHourModal();
    loadHoursDetail(projectId);
    
    // Atualizar visualização dos detalhes
    const projects = await fetchProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) showDetails(project);
  });

  // Vista inicial
  showHome();
});
