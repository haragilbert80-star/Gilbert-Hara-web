// script.js - ProTask Manager (Professional Edition)
// Features: LocalStorage persistence, Dark Mode, Search, Filters, Sorting, Due Date Alerts, Edit/Delete

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskCategory = document.getElementById('task-category');
const taskPriority = document.getElementById('task-priority');
const taskDueDate = document.getElementById('task-due-date');
const taskList = document.getElementById('task-list');
const emptyMessage = document.getElementById('empty-message');

const totalCount = document.getElementById('total-count');
const completedCount = document.getElementById('completed-count');
const pendingCount = document.getElementById('pending-count');

const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const themeToggle = document.getElementById('theme-toggle');

// App State
let tasks = JSON.parse(localStorage.getItem('protask-tasks')) || [];
let editId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  updateStats();
  loadTheme();
  
  // Event Listeners
  taskForm.addEventListener('submit', addOrUpdateTask);
  searchInput.addEventListener('input', renderTasks);
  filterCategory.addEventListener('change', renderTasks);
  filterStatus.addEventListener('change', renderTasks);
  themeToggle.addEventListener('click', toggleTheme);

  // Auto-save theme preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches && !localStorage.getItem('theme')) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
});

// Add or Update Task
function addOrUpdateTask(e) {
  e.preventDefault();

  const title = taskInput.value.trim();
  if (!title) return;

  const dueDateValue = taskDueDate.value ? new Date(taskDueDate.value) : null;

  const task = {
    id: editId || Date.now().toString(),
    title,
    category: taskCategory.value,
    priority: taskPriority.value,
    dueDate: dueDateValue ? dueDateValue.toISOString() : null,
    completed: editId ? tasks.find(t => t.id === editId).completed : false,
    createdAt: editId ? tasks.find(t => t.id === editId).createdAt : new Date().toISOString()
  };

  if (editId) {
    const index = tasks.findIndex(t => t.id === editId);
    tasks[index] = task;
    editId = null;
    taskForm.querySelector('.btn-primary').innerHTML = '<i class="fas fa-plus"></i> Add Task';
  } else {
    tasks.unshift(task); // New tasks at the top
  }

  saveTasks();
  renderTasks();
  updateStats();
  taskForm.reset();
}

// Render Tasks with Filters & Search
function renderTasks() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = filterCategory.value;
  const selectedStatus = filterStatus.value;

  let filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'completed' && task.completed) ||
      (selectedStatus === 'pending' && !task.completed);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort: High priority first, then by due date (soonest), then newest
  filteredTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  taskList.innerHTML = '';

  if (filteredTasks.length === 0) {
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
    li.dataset.id = task.id;

    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && !task.completed;
    const formattedDue = dueDate ? dueDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'No due date';

    li.innerHTML = `
      <div class="task-main">
        <label class="checkbox-container">
          <input type="checkbox" ${task.completed ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        <div class="task-info">
          <h3>${escapeHtml(task.title)}</h3>
          <div class="task-meta">
            <span class="category-badge">${task.category}</span>
            <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            <span class="due-date ${isOverdue ? 'overdue' : ''}">
              <i class="fas fa-clock"></i> ${formattedDue}
            </span>
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-edit" title="Edit" aria-label="Edit task">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-delete" title="Delete" aria-label="Delete task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Event: Toggle Complete
    li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
      toggleTaskComplete(task.id);
    });

    // Event: Edit Task
    li.querySelector('.btn-edit').addEventListener('click', () => {
      editTask(task.id);
    });

    // Event: Delete Task
    li.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTask(task.id);
    });

    taskList.appendChild(li);
  });
}

// Toggle Task Completion
function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
    updateStats();
  }
}

// Edit Task
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    taskInput.value = task.title;
    taskCategory.value = task.category;
    taskPriority.value = task.priority;
    taskDueDate.value = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '';

    editId = id;
    taskForm.querySelector('.btn-primary').innerHTML = '<i class="fas fa-save"></i> Update Task';
    taskInput.focus();
  }
}

// Delete Task with Confirmation
function deleteTask(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
  }
}

// Update Statistics
function updateStats() {
  totalCount.textContent = tasks.length;
  completedCount.textContent = tasks.filter(t => t.completed).length;
  pendingCount.textContent = tasks.filter(t => !t.completed).length;
}

// Save to LocalStorage
function saveTasks() {
  localStorage.setItem('protask-tasks', JSON.stringify(tasks));
}

// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  themeToggle.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

// Utility: Prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Optional: Keyboard shortcut - Press "N" to focus input
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' && document.activeElement !== taskInput) {
    e.preventDefault();
    taskInput.focus();
  }
});