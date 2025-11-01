// TaskWise Frontend JavaScript
class TaskWise {
    constructor() {
        this.apiBase = '/api';
        this.tasks = [];
        this.projects = [];
        this.currentFilter = 'all';
        this.currentProjectId = null;
        this.init();
    }

    async init() {
        await this.loadProjects();
        await this.loadTasks();
        await this.loadStats();
        this.setupEventListeners();
        this.initializeMiniCalendar();
        this.renderDashboard();
    }

    initializeMiniCalendar() {
        const calendarEl = document.getElementById('miniCalendar');
        if (!calendarEl) return;

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'today'
            },
            height: 'auto',
            events: this.getCalendarEvents.bind(this),
            eventClick: this.handleCalendarEventClick.bind(this),
            eventClassNames: this.getEventClassNames.bind(this),
            eventContent: this.renderEventContent.bind(this),
            eventDidMount: this.handleEventMount.bind(this)
        });

        calendar.render();
        this.miniCalendar = calendar;
    }

    getCalendarEvents() {
        return this.tasks
            .filter(task => task.due_date)
            .map(task => ({
                id: task.id.toString(),
                title: task.title,
                start: task.due_date,
                className: `priority-${task.priority}`,
                extendedProps: {
                    description: task.description,
                    priority: task.priority,
                    project: task.project,
                    progress: task.progress,
                    status: task.status
                }
            }));
    }

    handleCalendarEventClick(info) {
        const taskId = parseInt(info.event.id);
        this.showTaskDetails(taskId);
    }

    getEventClassNames(info) {
        const task = this.tasks.find(t => t.id === parseInt(info.event.id));
        if (!task) return [];

        const classes = [`priority-${task.priority}`];
        if (task.status === 'completed') classes.push('completed');
        if (task.status === 'overdue') classes.push('overdue');
        return classes;
    }

    renderEventContent(info) {
        const task = this.tasks.find(t => t.id === parseInt(info.event.id));
        if (!task) return;

        return {
            html: `
                <div class="fc-event-main-inner">
                    <div class="fc-event-title" title="${this.escapeHtml(task.title)}">
                        ${this.escapeHtml(task.title)}
                    </div>
                </div>
            `
        };
    }

    handleEventMount(info) {
        const task = this.tasks.find(t => t.id === parseInt(info.event.id));
        if (!task) return;

        // Add tooltip with more details
        const tooltip = `
            ${task.title}
            Status: ${task.status}
            Priority: ${task.priority}
            ${task.project ? `Project: ${task.project.name}` : ''}
            Progress: ${task.progress}%
        `;

        info.el.setAttribute('title', tooltip);
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'API call failed');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async loadTasks(filter = null) {
        try {
            let endpoint = '/tasks';
            if (filter) {
                const params = new URLSearchParams(filter);
                endpoint += `?${params}`;
            }
            
            const result = await this.apiCall(endpoint);
            this.tasks = result.tasks;
            this.renderTaskGrid();
        } catch (error) {
            console.error('Failed to load tasks:', error);
        }
    }

    async loadProjects() {
        try {
            const result = await this.apiCall('/projects');
            this.projects = result.projects;
            this.renderProjectsList();
        } catch (error) {
            console.error('Failed to load projects:', error);
        }
    }

    async loadStats() {
        try {
            const result = await this.apiCall('/stats');
            this.renderStats(result.stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async createTask(taskData) {
        try {
            const result = await this.apiCall('/tasks', 'POST', taskData);
            this.tasks.unshift(result.task);
            this.renderTaskGrid();
            this.loadStats(); // Refresh stats
            this.showNotification('success', 'Task created successfully!');
            return result.task;
        } catch (error) {
            console.error('Failed to create task:', error);
        }
    }

    async updateTask(taskId, updates) {
        try {
            const result = await this.apiCall(`/tasks/${taskId}`, 'PUT', updates);
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = result.task;
            }
            this.renderTaskGrid();
            this.loadStats(); // Refresh stats
            this.showNotification('success', 'Task updated successfully!');
            return result.task;
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    }

    async deleteTask(taskId) {
        try {
            await this.apiCall(`/tasks/${taskId}`, 'DELETE');
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTaskGrid();
            this.loadStats(); // Refresh stats
            this.showNotification('success', 'Task deleted successfully!');
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    }

    // Rendering Methods
    renderStats(stats) {
        document.querySelector('.stat-card:nth-child(1) .stat-info h3').textContent = stats.total_tasks;
        document.querySelector('.stat-card:nth-child(2) .stat-info h3').textContent = stats.completed_tasks;
        document.querySelector('.stat-card:nth-child(3) .stat-info h3').textContent = stats.in_progress_tasks;
        document.querySelector('.stat-card:nth-child(4) .stat-info h3').textContent = stats.overdue_tasks;
    }

    renderTaskGrid() {
        const taskGrid = document.querySelector('.task-grid');
        if (!taskGrid) return;

        // Filter tasks based on current filter
        let filteredTasks = this.tasks;
        if (this.currentFilter !== 'all') {
            filteredTasks = this.tasks.filter(task => {
                switch (this.currentFilter) {
                    case 'today':
                        const today = new Date().toDateString();
                        return task.due_date && new Date(task.due_date).toDateString() === today;
                    case 'week':
                        const weekFromNow = new Date();
                        weekFromNow.setDate(weekFromNow.getDate() + 7);
                        return task.due_date && new Date(task.due_date) <= weekFromNow;
                    case 'high':
                        return task.priority === 'high';
                    default:
                        return true;
                }
            });
        }

        // Clear existing tasks (keep the add-task card)
        const addTaskCard = taskGrid.querySelector('.add-task');
        taskGrid.innerHTML = '';

        // Render filtered tasks
        filteredTasks.forEach(task => {
            taskGrid.appendChild(this.createTaskCard(task));
        });

        // Re-add the add-task card
        if (addTaskCard) {
            taskGrid.appendChild(addTaskCard);
        }
    }

    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority}`;
        card.dataset.taskId = task.id;

        const priorityIcons = {
            high: 'fas fa-exclamation',
            medium: 'fas fa-minus',
            low: 'fas fa-arrow-down'
        };

        const statusColors = {
            todo: '#64748b',
            in_progress: '#f59e0b',
            completed: '#22c55e',
            overdue: '#ef4444'
        };

        const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

        card.innerHTML = `
            <div class="task-header">
                <div class="task-priority ${task.priority}">
                    <i class="${priorityIcons[task.priority]}"></i>
                </div>
                <div class="task-actions">
                    <i class="fas fa-star" onclick="taskWise.toggleFavorite(${task.id})"></i>
                    <i class="fas fa-ellipsis-h" onclick="taskWise.showTaskMenu(${task.id})"></i>
                </div>
            </div>
            <div class="task-content">
                <h3>${this.escapeHtml(task.title)}</h3>
                <p>${this.escapeHtml(task.description || 'No description')}</p>
                <div class="task-meta">
                    <div class="task-project">
                        <i class="fas fa-folder"></i>
                        <span>${task.project_name || 'No Project'}</span>
                    </div>
                    <div class="task-due ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar"></i>
                        <span>${dueDate}</span>
                    </div>
                </div>
                <div class="task-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                    </div>
                    <span>${task.progress}%</span>
                </div>
                <div class="task-status-actions">
                    <button class="btn-small ${task.status === 'in_progress' ? 'active' : ''}" 
                            onclick="taskWise.updateTaskStatus(${task.id}, 'in_progress')">
                        In Progress
                    </button>
                    <button class="btn-small ${task.status === 'completed' ? 'active' : ''}" 
                            onclick="taskWise.updateTaskStatus(${task.id}, 'completed')">
                        Complete
                    </button>
                </div>
            </div>
        `;

        // Add click event to open task details
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.task-actions') && !e.target.closest('.task-status-actions')) {
                this.showTaskDetails(task.id);
            }
        });

        return card;
    }

    renderProjectsList() {
        const projectsContainer = document.querySelector('#projects');
        if (!projectsContainer) return;

        // Start with the "Add New Project" button
        projectsContainer.innerHTML = `
            <div class="nav-item sub-item" id="addProjectBtn">
                <i class="fas fa-plus nav-icon"></i>
                <span>Add New Project</span>
            </div>
        `;

        // Add event listener to the "Add New Project" button
        document.getElementById('addProjectBtn').addEventListener('click', () => this.showProjectModal());

        // Add projects with task counts
        this.projects.forEach(project => {
            const taskCount = this.tasks.filter(task => task.project_id === project.id).length;
            const projectItem = document.createElement('div');
            projectItem.className = `nav-item sub-item${this.currentProjectId === project.id ? ' active' : ''}`;
            projectItem.innerHTML = `
                <i class="fas fa-circle nav-icon" style="color: ${project.color}"></i>
                <span>${this.escapeHtml(project.name)}</span>
                <span class="project-task-count">${taskCount}</span>
            `;
            projectItem.addEventListener('click', () => this.filterByProject(project.id));
            projectsContainer.appendChild(projectItem);
        });
    }

    // Event Handlers
    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const filter = e.target.textContent.toLowerCase();
                this.currentFilter = filter === 'all' ? 'all' : 
                                   filter === 'today' ? 'today' :
                                   filter === 'this week' ? 'week' :
                                   filter === 'high priority' ? 'high' : 'all';
                this.renderTaskGrid();
            });
        });

        // New Task button
        document.querySelector('.btn.primary').addEventListener('click', () => {
            this.showTaskModal();
        });

        // Add Task card
        document.querySelector('.add-task').addEventListener('click', () => {
            this.showTaskModal();
        });

        // New Project button
        document.querySelector('.btn.secondary').addEventListener('click', () => {
            this.showProjectModal();
        });
    }

    // Modal Methods
    showTaskModal(taskId = null) {
        const isEdit = taskId !== null;
        const task = isEdit ? this.tasks.find(t => t.id === taskId) : null;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Task' : 'New Task'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-body" id="taskForm">
                    <div class="form-group">
                        <label>Title *</label>
                        <input type="text" name="title" required value="${task?.title || ''}">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="3">${task?.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Priority</label>
                            <select name="priority">
                                <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Project</label>
                            <select name="project_id">
                                <option value="">No Project</option>
                                ${this.projects.map(p => 
                                    `<option value="${p.id}" ${task?.project_id === p.id ? 'selected' : ''}>${p.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="datetime-local" name="due_date" value="${task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''}">
                        </div>
                        <div class="form-group">
                            <label>Progress (%)</label>
                            <input type="number" name="progress" min="0" max="100" value="${task?.progress || 0}">
                        </div>
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn secondary modal-cancel">Cancel</button>
                    <button type="submit" form="taskForm" class="btn primary">${isEdit ? 'Update' : 'Create'} Task</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal(modal);
        });

        modal.querySelector('#taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const taskData = Object.fromEntries(formData.entries());
            
            // Convert empty strings to null
            Object.keys(taskData).forEach(key => {
                if (taskData[key] === '') taskData[key] = null;
            });

            try {
                if (isEdit) {
                    await this.updateTask(taskId, taskData);
                } else {
                    await this.createTask(taskData);
                }
                this.closeModal(modal);
            } catch (error) {
                // Error handling is done in the API methods
            }
        });
    }

    showProjectModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>New Project</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-body" id="projectForm">
                    <div class="form-group">
                        <label>Project Name *</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Color</label>
                        <input type="color" name="color" value="#667eea">
                    </div>
                </form>
                <div class="modal-footer">
                    <button type="button" class="btn secondary modal-cancel">Cancel</button>
                    <button type="submit" form="projectForm" class="btn primary">Create Project</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal(modal);
        });

        modal.querySelector('#projectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const projectData = Object.fromEntries(formData.entries());
            
            try {
                const result = await this.apiCall('/projects', 'POST', projectData);
                this.projects.push(result.project);
                this.renderProjectsList();
                this.showNotification('success', 'Project created successfully!');
                this.closeModal(modal);
            } catch (error) {
                // Error handling is done in the API method
            }
        });
    }

    closeModal(modal) {
        modal.remove();
    }

    // Utility Methods
    async updateTaskStatus(taskId, status) {
        await this.updateTask(taskId, { status });
    }

    showTaskDetails(taskId) {
        // Show task details modal (simplified for now)
        this.showTaskModal(taskId);
    }

    showTaskMenu(taskId) {
        // Show context menu for task actions (simplified)
        if (confirm('Delete this task?')) {
            this.deleteTask(taskId);
        }
    }

    toggleFavorite(taskId) {
        // Placeholder for favorite functionality
        console.log('Toggle favorite for task:', taskId);
    }

    filterByProject(projectId) {
        // Set the current project ID
        this.currentProjectId = projectId;

        // Update the UI to show which project is selected
        document.querySelectorAll('#projects .nav-item.sub-item').forEach(item => {
            item.classList.remove('active');
            if (item.querySelector(`[data-project-id="${projectId}"]`)) {
                item.classList.add('active');
            }
        });

        // Clear other filters
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('.tab:first-child').classList.add('active');
        this.currentFilter = 'all';

        // Load tasks for this project
        this.loadTasks({ project_id: projectId });

        // Update Projects button to show current project
        const projectName = this.projects.find(p => p.id === projectId)?.name || 'All Projects';
        document.querySelector('.nav-item[onclick="toggleProjects()"] span').textContent = projectName;
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderDashboard() {
        // This method is called after initial load
        console.log('TaskWise Dashboard loaded successfully!');
    }
}

// Initialize TaskWise when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.taskWise = new TaskWise();
});

// Additional utility functions
function toggleProjects() {
    const projects = document.getElementById('projects');
    const arrow = document.querySelector('.nav-arrow');
    const projectsButton = document.querySelector('.nav-item[onclick="toggleProjects()"]');
    
    projects.classList.toggle('show');
    arrow.style.transform = projects.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
    projectsButton.classList.toggle('active');
}