"""
TaskWise models package
"""
from config import db
from datetime import datetime, timedelta
from enum import Enum

# Enums
class TaskStatus(Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

# Import all models
from .base import Project, Task
from .progress_tracking import TimeEntry, Subtask, TaskDependency, ProgressSnapshot

__all__ = [
    'Project', 'Task', 'TimeEntry', 'Subtask', 'TaskDependency', 
    'ProgressSnapshot', 'TaskStatus', 'Priority'
]