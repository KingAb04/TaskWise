from config import db
from datetime import datetime
from enum import Enum

class TaskStatus(Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#667eea')  # Hex color code
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Project {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'task_count': len(self.tasks)
        }

class Task(db.Model):
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority = db.Column(db.Enum(Priority), default=Priority.MEDIUM, nullable=False)
    progress = db.Column(db.Integer, default=0)  # 0-100
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # Foreign Keys
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'))
    
    def __repr__(self):
        return f'<Task {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status.value if self.status else None,
            'priority': self.priority.value if self.priority else None,
            'progress': self.progress,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'project_id': self.project_id,
            'project_name': self.project.name if self.project else None,
            'project_color': self.project.color if self.project else '#667eea'
        }
    
    def mark_completed(self):
        self.status = TaskStatus.COMPLETED
        self.progress = 100
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def is_overdue(self):
        if self.due_date and self.status != TaskStatus.COMPLETED:
            return datetime.utcnow() > self.due_date
        return False