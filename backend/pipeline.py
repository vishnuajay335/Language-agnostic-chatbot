import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFDirectoryLoader, TextLoader, DirectoryLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from logger import log_chat
import shutil

load_dotenv()

# Disable ChromaDB telemetry to stop background errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

# Initialize models - Upgraded to specialized multilingual model for Pan-India support
embeddings = HuggingFaceEmbeddings(model_name="paraphrase-multilingual-MiniLM-L12-v2")
llm = ChatGroq(model_name="llama-3.1-8b-instant", temperature=0.3)

def load_and_process_documents():
    """Load PDFs and text files from the data directory and ingest into vector db."""
    # Load PDFs
    pdf_loader = PyPDFDirectoryLoader(DATA_DIR)
    pdf_docs = pdf_loader.load()
    
    # Load text files
    txt_loader = DirectoryLoader(DATA_DIR, glob="**/*.txt", loader_cls=TextLoader)
    txt_docs = txt_loader.load()
    
    docs = pdf_docs + txt_docs
    
    if not docs:
        print("No documents found in the data directory.")
        return None
        
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    # Create and persist vector db
    vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=CHROMA_DB_DIR)
    vectorstore.persist()
    print(f"Ingested {len(splits)} chunks into the database.")
    return vectorstore

def process_single_document(file_path: str):
    """Dynamically chunk and add a single new file into the existing vector store."""
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith('.txt'):
        loader = TextLoader(file_path)
    else:
        return
        
    docs = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)
    
    if os.path.exists(CHROMA_DB_DIR) and len(os.listdir(CHROMA_DB_DIR)) > 0:
        vectorstore = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
        vectorstore.add_documents(splits)
        vectorstore.persist()
    else:
        # If DB didn't exist, create it with this first document
        vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=CHROMA_DB_DIR)
        vectorstore.persist()
        
    # Re-initialize the global chain with the completely updated retriever 
    global rag_chain, retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    print(f"Added {file_path} chunks and refreshed memory.")

def delete_document(filename: str):
    """Deletes the document from disk and completely rebuilds the vector store to avoid ghosts."""
    file_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Wipe the existing vector store database physically
    if os.path.exists(CHROMA_DB_DIR):
        shutil.rmtree(CHROMA_DB_DIR)
        
    global rag_chain, retriever
    
    # Rebuild from scratch if there are files left
    vectorstore = get_retriever()
    if vectorstore is not None:
        retriever = vectorstore
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    else:
        rag_chain = None
        retriever = None
    return True

def get_retriever():
    """Retrieve or create the vector database"""
    if os.path.exists(CHROMA_DB_DIR) and len(os.listdir(CHROMA_DB_DIR)) > 0:
        vectorstore = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=embeddings)
    else:
        # DB doesn't exist, create it from docs
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR, exist_ok=True)
        vectorstore = load_and_process_documents()
        
    if vectorstore is None:
        return None
        
    return vectorstore.as_retriever(search_kwargs={"k": 5})

# Setup the RAG Chain
retriever = get_retriever()

system_prompt = (
    "You are a helpful and polite virtual assistant for the university/college campus. "
    "You answer student queries related to fees, scholarships, policies, and schedules. "
    "\n\n"
    "### CRITICAL LANGUAGE INSTRUCTION ###\n"
    "You MUST respond to the student EXCLUSIVELY in the following language: {target_language}. "
    "Even if the student asks you a question in English, you MUST translate your answer and reply back in {target_language}. "
    "Do NOT apologize for the language, just reply directly in {target_language}. "
    "### IMPORTANT: Support for Romanized Script ###\n"
    "Students may type regional languages using English characters (e.g., 'Fees kiti ahet?' for Marathi "
    "or 'Fees kitni hai?' for Hindi). You MUST recognize these transliterated inputs and respond "
    "in the same regional language and script requested by the user (or English script if they prefer). "
    "\n\n"
    "Supported languages include: English, Hindi (हिंदी), Marathi (मराठी), Bengali (বাংলা), "
    "Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Gujarati (ગુજરાતી), "
    "Punjabi (ਪੰਜਾਬੀ), Urdu (اردو), Odia (ଓଡ଼ିଆ), and Assamese (অসমীয়া). "
    "\n\n"
    "Use the following pieces of retrieved context to answer the question. "
    "If the answer is in the context, provide it clearly. "
    "If the context contains contact emails or phone numbers for the relevant administrative office, "
    "include them in your response as part of the human support fallback. "
    "\n\n"
    "If the context does NOT have the information, state that clearly and advise the student "
    "to contact the administrative office immediately for support. Use any contact details "
    "found in the context if available. "
    "Keep answers clear, concise, and structured.\n\n"
    "Context: {context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# Initialize the RAG chain globally if retriever is available
rag_chain = None
if retriever:
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

def get_answer(query: str, language: str = "en") -> str:
    """Takes a query and returns the answer using RAG."""
    global rag_chain, retriever
    
    # Map raw language codes to explicit language names so the LLM doesn't hallucinate
    lang_map = {
        "hi": "Hindi (हिंदी)", "mr": "Marathi (मराठी)", "bn": "Bengali (বাংলা)", "ta": "Tamil (தமிழ்)",
        "te": "Telugu (తెలుగు)", "ml": "Malayalam (മലയാളം)", "kn": "Kannada (ಕನ್ನಡ)", "gu": "Gujarati (ગુજરાતી)",
        "pa": "Punjabi (ਪੰਜਾਬੀ)", "ur": "Urdu (اردو)", "en": "English", "or": "Odia (ଓଡ଼ିଆ)", "as": "Assamese (অসমীয়া)"
    }
    lang_full_name = lang_map.get(language, "English")
    
    # Try re-initializing if docs were added late
    if rag_chain is None:
        retriever = get_retriever()
        if retriever is None:
            # Fallback when no docs are uploaded yet
            response = llm.invoke([
                ("system", system_prompt.replace("{context}", "No institutional documents have been uploaded yet.").replace("{target_language}", lang_full_name)),
                ("human", query)
            ])
            log_chat(query, response.content, language)
            return response.content
            
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    if rag_chain:
        response = rag_chain.invoke({"input": query, "target_language": lang_full_name})
        answer = response["answer"]
        log_chat(query, answer, language)
        return answer
        
    return "The system is currently unavailable. Please contact the administrative office. "


def translate_text(text: str, target_lang: str) -> str:
    """Simple translation utility using the LLM."""
    # Mapping some internal codes to full names for better LLM performance
    lang_map = {
        "hi": "Hindi", "mr": "Marathi", "bn": "Bengali", "ta": "Tamil",
        "te": "Telugu", "ml": "Malayalam", "kn": "Kannada", "gu": "Gujarati",
        "pa": "Punjabi", "ur": "Urdu", "en": "English"
    }
    lang_full = lang_map.get(target_lang, target_lang)
    
    prompt = f"Translate the following campus-related text to {lang_full}. Maintain any technical terms or numbers as is. Return ONLY the translated text, nothing else.\n\nText: {text}"
    response = llm.invoke(prompt)
    return response.content
