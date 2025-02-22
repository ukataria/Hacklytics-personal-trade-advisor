import faiss
import numpy as np
import pickle

EMBEDDING_DIM = 384   
M = 32 

class VectorStore:
    def __init__(self):
        self.index = faiss.IndexHNSWFlat(EMBEDDING_DIM, M)
        self.documents = []
    
    def add_document(self, embedding: np.ndarray, metadata: dict):
        embedding = np.array(embedding, dtype=np.float32).reshape(1, EMBEDDING_DIM)
        self.index.add(embedding)
        self.documents.append(metadata)
    
    def search(self, query_embedding: np.ndarray, top_k=5):
        # Ensure query_embedding is shaped correctly
        query_embedding = np.array(query_embedding, dtype=np.float32).reshape(1, EMBEDDING_DIM)
        # If there are no documents in the index, return an empty list
        if self.index.ntotal == 0:
            return []
        distances, indices = self.index.search(query_embedding, top_k)
        results = []
        # Safely iterate over the returned indices
        for i in indices[0]:
            if i < len(self.documents):
                results.append(self.documents[i])
        return results
    
    def save_index(self, filepath: str):
        faiss.write_index(self.index, filepath)
        with open(filepath + ".meta", "wb") as f:
            pickle.dump(self.documents, f)
    
    def load_index(self, filepath: str):
        self.index = faiss.read_index(filepath)
        with open(filepath + ".meta", "rb") as f:
            self.documents = pickle.load(f)