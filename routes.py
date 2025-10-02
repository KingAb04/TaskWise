from flask import request, jsonify, render_template
from config import db
from models import Task, Project, TaskStatus, Priority
from datetime import datetime
import json

def register_routes(app):
    
    # Dashboard route - serve the main page
    @app.route('/')
    def dashboard():
        return render_template('index.html')

    # API Routes for Tasks
    @app.route('/api/tasks', methods=['GET'])
    def get_tasks():
        """Get all tasks with optional filtering"""
        try:
            # Get query parameters
            status = request.args.get('status')
            priority = request.args.get('priority')
            project_id = request.args.get('project_id')
            
            # Build query
            query = Task.query
            
            if status:
                query = query.filter(Task.status == TaskStatus(status))
            if priority:
                query = query.filter(Task.priority == Priority(priority))
            if project_id:
                query = query.filter(Task.project_id == project_id)
            
            # Order by created_at desc
            tasks = query.order_by(Task.created_at.desc()).all()
            
            return jsonify({
                'success': True,
                'tasks': [task.to_dict() for task in tasks],
                'count': len(tasks)
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/tasks', methods=['POST'])
    def create_task():
        """Create a new task"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('title'):
                return jsonify({'success': False, 'error': 'Title is required'}), 400
            
            # Create new task
            task = Task(
                title=data['title'],
                description=data.get('description', ''),
                priority=Priority(data.get('priority', 'medium')),
                project_id=data.get('project_id'),
                progress=data.get('progress', 0)
            )
            
            # Set due date if provided
            if data.get('due_date'):
                task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            
            db.session.add(task)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Task created successfully',
                'task': task.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/tasks/<int:task_id>', methods=['GET'])
    def get_task(task_id):
        """Get a specific task"""
        try:
            task = Task.query.get_or_404(task_id)
            return jsonify({
                'success': True,
                'task': task.to_dict()
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/tasks/<int:task_id>', methods=['PUT'])
    def update_task(task_id):
        """Update a task"""
        try:
            task = Task.query.get_or_404(task_id)
            data = request.get_json()
            
            # Update fields
            if 'title' in data:
                task.title = data['title']
            if 'description' in data:
                task.description = data['description']
            if 'status' in data:
                task.status = TaskStatus(data['status'])
                if data['status'] == 'completed':
                    task.mark_completed()
            if 'priority' in data:
                task.priority = Priority(data['priority'])
            if 'progress' in data:
                task.progress = data['progress']
            if 'project_id' in data:
                task.project_id = data['project_id']
            if 'due_date' in data:
                if data['due_date']:
                    task.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                else:
                    task.due_date = None
            
            task.updated_at = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Task updated successfully',
                'task': task.to_dict()
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
    def delete_task(task_id):
        """Delete a task"""
        try:
            task = Task.query.get_or_404(task_id)
            db.session.delete(task)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Task deleted successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    # API Routes for Projects
    @app.route('/api/projects', methods=['GET'])  
    def get_projects():
        """Get all projects"""
        try:
            projects = Project.query.order_by(Project.name).all()
            return jsonify({
                'success': True,
                'projects': [project.to_dict() for project in projects],
                'count': len(projects)
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    @app.route('/api/projects', methods=['POST'])
    def create_project():
        """Create a new project"""
        try:
            data = request.get_json()
            
            if not data.get('name'):
                return jsonify({'success': False, 'error': 'Project name is required'}), 400
            
            project = Project(
                name=data['name'],
                description=data.get('description', ''),
                color=data.get('color', '#667eea')
            )
            
            db.session.add(project)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Project created successfully',
                'project': project.to_dict()
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': str(e)}), 500

    # Dashboard Statistics API
    @app.route('/api/stats', methods=['GET'])
    def get_dashboard_stats():
        """Get dashboard statistics"""
        try:
            total_tasks = Task.query.count()
            completed_tasks = Task.query.filter(Task.status == TaskStatus.COMPLETED).count()
            in_progress_tasks = Task.query.filter(Task.status == TaskStatus.IN_PROGRESS).count()
            
            # Calculate overdue tasks
            overdue_tasks = Task.query.filter(
                Task.due_date < datetime.utcnow(),
                Task.status != TaskStatus.COMPLETED
            ).count()
            
            # Calculate completion rate
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            return jsonify({
                'success': True,
                'stats': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'in_progress_tasks': in_progress_tasks,
                    'overdue_tasks': overdue_tasks,
                    'completion_rate': round(completion_rate, 1),
                    'todo_tasks': total_tasks - completed_tasks - in_progress_tasks
                }
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    # Recent tasks for dashboard
    @app.route('/api/tasks/recent', methods=['GET'])
    def get_recent_tasks():
        """Get recent tasks for dashboard"""
        try:
            limit = request.args.get('limit', 6, type=int)
            tasks = Task.query.order_by(Task.updated_at.desc()).limit(limit).all()
            
            return jsonify({
                'success': True,
                'tasks': [task.to_dict() for task in tasks]
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500