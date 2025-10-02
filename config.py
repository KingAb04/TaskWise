from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_marshmallow import Marshmallow
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
ma = Marshmallow()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions with app
    db.init_app(app)
    ma.init_app(app)
    CORS(app)
    
    # Import and register routes
    from routes import register_routes
    register_routes(app)
    
    return app