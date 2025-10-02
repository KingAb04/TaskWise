# TaskWise Setup Instructions

## Phase 1: Basic Task Management System

### Prerequisites
1. **Python 3.8+** installed
2. **MySQL Server** running (XAMPP recommended)
3. **pip** package manager

### Installation Steps

#### 1. Setup Python Environment and Install Dependencies
```bash
# Navigate to the TaskWise directory
cd c:\xampp\htdocs\TaskWise

# The project uses a virtual environment (.venv) that's automatically configured
# Dependencies are installed automatically when you run the setup
# Required packages: Flask, Flask-SQLAlchemy, Flask-CORS, PyMySQL, python-dotenv, etc.
```

#### 2. Configure Database
1. Start XAMPP and ensure MySQL is running
2. Update `.env` file with your MySQL credentials:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=taskwise_db
   DB_PORT=3306
   ```

#### 3. Initialize Database
```bash
# Run the database setup script
python setup_db.py
```

#### 4. Start the Application
```bash
# Run the Flask application using the virtual environment
C:/xampp/htdocs/TaskWise/.venv/Scripts/python.exe app.py

# Or if you're in the virtual environment:
python app.py
```

The application will be available at: `http://localhost:5000`

**Note**: The application uses a virtual environment (`.venv`) for dependency management.

### What's Implemented (Phase 1)

✅ **Backend (Python Flask)**
- REST API for tasks and projects
- MySQL database with proper models
- CRUD operations for tasks
- Dashboard statistics API

✅ **Frontend (JavaScript)**
- Interactive dashboard with real-time data
- Task creation and editing modals
- Project management
- Task filtering and status updates
- Responsive design

✅ **Features**
- Create, edit, and delete tasks
- Set priorities (High, Medium, Low)
- Track progress (0-100%)
- Set due dates
- Organize tasks by projects
- Dashboard statistics
- Task status management (Todo, In Progress, Completed)
- Overdue task detection

### API Endpoints

#### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/<id>` - Get specific task
- `PUT /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task
- `GET /api/tasks/recent` - Get recent tasks

#### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project

#### Statistics
- `GET /api/stats` - Get dashboard statistics

### File Structure
```
TaskWise/
├── app.py                 # Flask application entry point
├── config.py              # Flask app configuration and factory
├── models.py              # Database models (Task, Project)
├── routes.py              # API routes and endpoints
├── setup_db.py            # Database initialization script
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (database config)
├── .venv/                 # Virtual environment directory
├── templates/
│   └── index.html         # Main dashboard template
├── static/
│   ├── css/
│   │   ├── dashboard.css  # Main dashboard styles
│   │   └── cards.css      # Task card styles
│   ├── js/
│   │   └── taskwise.js    # Frontend JavaScript functionality
│   └── assets/
│       └── taskwise-logo-1.png  # Logo file
├── __pycache__/           # Python cache files
└── index.html             # Original static file (kept for reference)
```

### Next Phases

#### Phase 2: Advanced Features
- User authentication and sessions
- Pomodoro timer integration
- Email notifications
- Task comments and attachments
- Team collaboration

#### Phase 3: Analytics & Collaboration
- Advanced dashboard charts
- Time tracking
- Team management
- Activity feeds
- Export functionality

### Troubleshooting

#### Database Connection Issues
- Ensure MySQL is running in XAMPP
- Check credentials in `.env` file
- Verify database exists: `SHOW DATABASES;`
- Default credentials: user=`root`, password=`` (empty)

#### Import Errors
- The project uses a virtual environment (`.venv`)
- Run with full path: `C:/xampp/htdocs/TaskWise/.venv/Scripts/python.exe app.py`
- If packages are missing, they should be auto-installed

#### Port Already in Use
- Change port in `app.py`: `app.run(port=5001)`
- Or kill existing process using port 5000
- Check running processes: `netstat -ano | findstr :5000`

#### Virtual Environment Issues
- Virtual environment is located in `.venv` folder
- Always use the full Python path when running scripts
- Environment is automatically configured for the project

### Current Application Status

**✅ FULLY FUNCTIONAL** - The application is currently running and working!

**What's Working Right Now:**
- ✅ Flask server running on `http://localhost:5000`
- ✅ MySQL database with sample data loaded
- ✅ Interactive dashboard with task management
- ✅ Real-time statistics and progress tracking
- ✅ Task creation, editing, and deletion
- ✅ Project organization system
- ✅ Beautiful responsive UI matching TaskWise branding

### Usage
1. **Access the app**: Open `http://localhost:5000` in your browser
2. **Create tasks**: Click "New Task" button or the "+" card
3. **Manage tasks**: Click on any task card to edit details
4. **Filter tasks**: Use tabs (All, Today, This Week, High Priority)
5. **Create projects**: Click "New Project" to organize tasks
6. **Track progress**: Update task status and progress bars
7. **View stats**: Monitor dashboard statistics in real-time

### Sample Data Included
The database comes pre-loaded with:
- 4 sample projects (Website Redesign, Mobile App, Marketing, Personal)
- 6 sample tasks with different priorities and statuses
- Realistic due dates and progress tracking

**🎉 Your TaskWise task management system is ready to use!** 🚀