const shell = document.getElementById('shell');
const panelToggle = document.getElementById('panelToggle');
const panelClose = document.getElementById('panelClose');

if (shell && panelToggle) {
  const sync = () => panelToggle.classList.toggle('active', shell.classList.contains('panel-open'));
  panelToggle.addEventListener('click', () => { shell.classList.toggle('panel-open'); sync(); });
  if (panelClose) panelClose.addEventListener('click', () => { shell.classList.remove('panel-open'); sync(); });
}

const targetList = document.getElementById('targetList');
if (targetList) {
  document.querySelectorAll('.target-row').forEach((row) => row.addEventListener('click', () => {
    targetList.hidden = true;
    document.getElementById(row.dataset.detail).hidden = false;
  }));
  document.querySelectorAll('.target-detail .back').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.target-detail').forEach((detail) => { detail.hidden = true; });
    targetList.hidden = false;
  }));
}

document.querySelectorAll('textarea').forEach((area) => area.addEventListener('input', () => {
  area.style.height = 'auto';
  area.style.height = area.scrollHeight + 'px';
}));
