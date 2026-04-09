import json
import os
from datetime import datetime

LOG_FILE = os.path.join(os.path.dirname(__file__), "logs", "chat_history.json")

def ensure_log_dir():
    log_dir = os.path.dirname(LOG_FILE)
    if not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)

def log_chat(query, response, language, source="web"):
    """
    Logs chat interaction to a JSON file for hackathon 'Data for Improvement' requirement.
    """
    ensure_log_dir()
    
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "query": query,
        "response": response,
        "language": language,
        "source": source
    }
    
    history = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            history = []
            
    history.append(log_entry)
    
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=4, ensure_ascii=False)
