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

function renderCategoryNav(current){
  const nav = document.getElementById('category-nav');
  if (!nav) return;
  nav.innerHTML = '';
  CATEGORIES.filter(c => c !== current).forEach(c => {
    const b = el('button');
    b.textContent = c;
    b.onclick = () => navigateToCategory(c);
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

// Inicialização segura do Service Worker no GitHub Pages
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(getAppUrl('sw.js')).catch((err) => {
      console.warn('Service Worker registration note:', err);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
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
