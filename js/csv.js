// ── CSV PARSING ───────────────────────────────────────
function parseCSVRow(line) {
  const fields = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const f = parseCSVRow(line);
    if (f.length < 3) continue;
    const cat = f[0].trim();
    if (i === 0 && cat.toLowerCase() === 'category') continue;
    const pts = parseInt(f[1].trim().replace(/[^0-9]/g, ''), 10);
    const question = f[2].trim();
    const answer = (f[3] || '').trim() || null;
    const question_image = (f[4] || '').trim() || null;
    const answer_image   = (f[5] || '').trim() || null;
    if (!cat || isNaN(pts) || !question) continue;
    result.push({ category: cat, points: pts, question, answer, question_image, answer_image });
  }
  return result;
}

// ── CSV LOAD UI ───────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) loadFile(file);
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => processCSV(e.target.result, file.name);
  reader.readAsText(file);
}

function processCSV(text, filename) {
  const errEl = document.getElementById('csv-error');
  const previewEl = document.getElementById('csv-preview');
  const continueBtn = document.getElementById('csv-continue-btn');
  errEl.style.display = 'none';

  let parsed;
  try { parsed = parseCSV(text); }
  catch (err) {
    showCSVError('Parse error: ' + err.message);
    previewEl.style.display = 'none';
    continueBtn.style.display = 'none';
    return;
  }

  if (parsed.length === 0) {
    showCSVError('No valid rows found. Expected: category,points,question,answer');
    previewEl.style.display = 'none';
    continueBtn.style.display = 'none';
    return;
  }

  questions = parsed;
  const cats = [...new Set(parsed.map(q => q.category))];
  const minPts = Math.min(...parsed.map(q => q.points));
  const maxPts = Math.max(...parsed.map(q => q.points));

  const withImages = parsed.filter(q => q.question_image || q.answer_image).length;
  previewEl.innerHTML = `
    <h3>Loaded: ${esc(filename)}</h3>
    <div class="preview-stat">Questions: <span>${parsed.length}</span></div>
    <div class="preview-stat">Categories (${cats.length}): <span>${cats.map(esc).join(', ')}</span></div>
    <div class="preview-stat">Point range: <span>$${minPts} &ndash; $${maxPts}</span></div>
    ${withImages ? `<div class="preview-stat">Images: <span>${withImages} question${withImages !== 1 ? 's' : ''}</span></div>` : ''}
  `;
  previewEl.style.display = 'block';
  continueBtn.style.display = 'inline-block';

  dropZone.querySelector('.dz-icon').textContent = '✅';
  dropZone.querySelector('.dz-label').textContent = esc(filename);
  dropZone.querySelector('.dz-sub').textContent = 'Click to choose a different file';
  setStatus('File loaded: ' + esc(filename));
}

function showCSVError(msg) {
  const el = document.getElementById('csv-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function showSetup() {
  setScreen('csv-screen', false);
  setScreen('setup-screen', true);
  if (document.querySelectorAll('.player-row').length === 0) {
    addPlayerRow(); addPlayerRow(); addPlayerRow(); addPlayerRow();
  }
  setStatus('Player setup');
}
