const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3300;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');
const HOURS_FILE = path.join(DATA_DIR, 'hours.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function readHours() {
  try {
    const content = await fs.readFile(HOURS_FILE, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeHours(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(HOURS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/projects', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/projects', async (req, res) => {
  const data = await readData();
  const project = {
    id: Date.now().toString(),
    title: req.body.title || 'Untitled',
    description: req.body.description || '',
    notes: req.body.notes || '',
    category: req.body.category || 'Outros',
    image: req.body.image || null,
    status: req.body.status || 'Planned',
    numPoints: req.body.numPoints || null,
    dimensionsCm: req.body.dimensionsCm || null,
    dimensionsPoints: req.body.dimensionsPoints || null,
    numColors: req.body.numColors || null,
    acquisitionDate: req.body.acquisitionDate || null,
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    completion: req.body.completion || 0,
    costs: req.body.costs || null,
    forSale: req.body.forSale || false,
    hourLog: req.body.hourLog || []
  };
  data.push(project);
  await writeData(data);
  res.status(201).json(project);
});

app.put('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  const data = await readData();
  const idx = data.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data[idx] = { ...data[idx], ...req.body, id };
  await writeData(data);
  res.json(data[idx]);
});

app.delete('/api/projects/:id', async (req, res) => {
  const id = req.params.id;
  const data = await readData();
  const idx = data.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = data.splice(idx, 1)[0];
  await writeData(data);
  res.json(removed);
});

// Hour logging endpoints
app.get('/api/hours/:projectId', async (req, res) => {
  const projectId = req.params.projectId;
  const hours = await readHours();
  const projectHours = [];
  for (const category in hours) {
    if (hours[category][projectId]) {
      projectHours.push(...hours[category][projectId]);
    }
  }
  res.json(projectHours);
});

app.post('/api/hours', async (req, res) => {
  const { projectId, category, date, startTime, duration, pointsDone } = req.body;
  
  // Read project to get total points
  const projects = await readData();
  const project = projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  // Read hours
  const hours = await readHours();
  if (!hours[category]) hours[category] = {};
  if (!hours[category][projectId]) hours[category][projectId] = [];
  
  // Calculate totals
  const previousTotal = hours[category][projectId].reduce((sum, h) => sum + (h.pointsDone || 0), 0);
  const totalPoints = previousTotal + pointsDone;
  const percentage = project.numPoints ? Math.round((totalPoints / project.numPoints) * 100) : 0;
  
  const hour = {
    id: Date.now().toString(),
    date,
    startTime,
    duration,
    pointsDone,
    totalPoints,
    percentage
  };
  
  hours[category][projectId].push(hour);
  await writeHours(hours);
  
  // Update project completion
  const projects2 = await readData();
  const idx = projects2.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    projects2[idx].completion = Math.min(percentage, 100);
    await writeData(projects2);
  }
  
  res.status(201).json(hour);
});

app.put('/api/hours/:projectId/:hourId', async (req, res) => {
  const { projectId, hourId } = req.params;
  const { date, startTime, duration, pointsDone } = req.body;
  const hours = await readHours();
  
  for (const category in hours) {
    if (hours[category][projectId]) {
      const idx = hours[category][projectId].findIndex(h => h.id === hourId);
      if (idx !== -1) {
        // Update the hour entry
        hours[category][projectId][idx] = {
          ...hours[category][projectId][idx],
          date,
          startTime,
          duration,
          pointsDone
        };
        
        // Recalculate totals for all entries
        let runningTotal = 0;
        const project = (await readData()).find(p => p.id === projectId);
        for (const h of hours[category][projectId]) {
          runningTotal += h.pointsDone || 0;
          h.totalPoints = runningTotal;
          h.percentage = project.numPoints ? Math.round((runningTotal / project.numPoints) * 100) : 0;
        }
        
        await writeHours(hours);
        
        // Update project completion
        const percentage = hours[category][projectId].length > 0 
          ? hours[category][projectId][hours[category][projectId].length - 1].percentage 
          : 0;
        const projects = await readData();
        const pidx = projects.findIndex(p => p.id === projectId);
        if (pidx !== -1) {
          projects[pidx].completion = percentage;
          await writeData(projects);
        }
        
        return res.json(hours[category][projectId][idx]);
      }
    }
  }
  res.status(404).json({ error: 'Hour not found' });
});

app.delete('/api/hours/:projectId/:hourId', async (req, res) => {
  const { projectId, hourId } = req.params;
  const hours = await readHours();
  
  for (const category in hours) {
    if (hours[category][projectId]) {
      const idx = hours[category][projectId].findIndex(h => h.id === hourId);
      if (idx !== -1) {
        const removed = hours[category][projectId].splice(idx, 1)[0];
        
        // Recalculate totals for remaining entries
        let runningTotal = 0;
        const project = (await readData()).find(p => p.id === projectId);
        for (const h of hours[category][projectId]) {
          runningTotal += h.pointsDone || 0;
          h.totalPoints = runningTotal;
          h.percentage = project.numPoints ? Math.round((runningTotal / project.numPoints) * 100) : 0;
        }
        
        await writeHours(hours);
        
        // Update project completion
        const percentage = hours[category][projectId].length > 0 
          ? hours[category][projectId][hours[category][projectId].length - 1].percentage 
          : 0;
        const projects = await readData();
        const pidx = projects.findIndex(p => p.id === projectId);
        if (pidx !== -1) {
          projects[pidx].completion = percentage;
          await writeData(projects);
        }
        
        return res.json(removed);
      }
    }
  }
  res.status(404).json({ error: 'Hour not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
