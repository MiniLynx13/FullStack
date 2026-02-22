import sqlite3
from datetime import datetime
from .config import DATABASE_PATH

def get_db_connection():
    """Подключение к SQLite базе данных"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Чтобы получать результаты как словари
    return conn

def init_db():
    """Инициализация базы данных"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Создание таблицы пользователей
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы токенов
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            token VARCHAR(255) UNIQUE NOT NULL,
            token_type VARCHAR(10) NOT NULL DEFAULT 'access',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')
    
    # Создание таблицы медицинских данных
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_medical_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(id),
            contraindications TEXT,
            allergens TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    # Создание таблицы сохраненных анализов
    cur.execute('''
        CREATE TABLE IF NOT EXISTS saved_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            image_path TEXT NOT NULL,
            analysis_result TEXT NOT NULL,
            ingredients_count INTEGER DEFAULT 0,
            warnings_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')

    cur.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
    
    conn.commit()
    conn.close()

def cleanup_expired_tokens():
    """Очистка просроченных токенов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM user_tokens WHERE expires_at <= ?', 
                (datetime.now().isoformat(),))
    
    deleted_count = cur.rowcount
    conn.commit()
    conn.close()
    
    if deleted_count > 0:
        print(f"Удалено {deleted_count} просроченных токенов")
    
    return deleted_count