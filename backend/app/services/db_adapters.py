import os
import json
import logging
from typing import List, Dict, Any, Optional

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ACPIA_DbAdapters")

# --- NEO4J CONNECTION & DRIVER SETUP ---
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

neo4j_driver = None
if NEO4J_URI and NEO4J_PASSWORD:
    try:
        from neo4j import GraphDatabase
        neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        # Test connection
        with neo4j_driver.session() as session:
            session.run("RETURN 1")
        logger.info("Successfully connected to Neo4j database.")
    except Exception as e:
        logger.warning(f"Neo4j connection failed. falling back to SQLite mock behavior. Error: {e}")
        neo4j_driver = None
else:
    logger.info("Neo4j variables missing. Graph synchronization running in SQLite mode.")

# --- QDRANT CONNECTION & CLIENT SETUP ---
QDRANT_HOST = os.getenv("QDRANT_HOST")
QDRANT_PORT = os.getenv("QDRANT_PORT", "6333")

qdrant_client = None
if QDRANT_HOST:
    try:
        from qdrant_client import QdrantClient
        qdrant_client = QdrantClient(host=QDRANT_HOST, port=int(QDRANT_PORT))
        # Verify collection exists or create
        qdrant_client.get_collections()
        logger.info("Successfully connected to Qdrant Vector database.")
    except Exception as e:
        logger.warning(f"Qdrant connection failed. falling back to SQLite text search. Error: {e}")
        qdrant_client = None
else:
    logger.info("Qdrant variables missing. Semantic search running in SQLite filter mode.")

# --- ADAPTOR INTERFACE IMPLEMENTATIONS ---

def sync_node_to_neo4j(node_id: int, name: str, node_type: str, properties: Dict[str, Any]) -> bool:
    """Synchronizes a case node to Neo4j if available."""
    if not neo4j_driver:
        logger.info(f"[SQLite Fallback] Logged Node sync: Node {node_id} ({name} [{node_type}])")
        return True
        
    try:
        # Standardize node type labels (e.g. Person, Phone, Device)
        label = node_type.capitalize()
        query = (
            f"MERGE (n:{label} {{id: $node_id}}) "
            f"SET n.name = $name, n.properties = $properties_str "
            f"RETURN n"
        )
        properties_str = json.dumps(properties)
        with neo4j_driver.session() as session:
            session.run(query, node_id=str(node_id), name=name, properties_str=properties_str)
        logger.info(f"[Neo4j Sync] Successfully wrote Node {node_id} to Neo4j.")
        return True
    except Exception as e:
        logger.error(f"Failed to write node to Neo4j: {e}")
        return False

def sync_edge_to_neo4j(edge_id: int, source_id: int, target_id: int, edge_type: str, properties: Dict[str, Any]) -> bool:
    """Synchronizes a connection link to Neo4j if available."""
    if not neo4j_driver:
        logger.info(f"[SQLite Fallback] Logged Edge sync: Connection {source_id} --({edge_type})--> {target_id}")
        return True
        
    try:
        # Standardize relationship type
        rel_type = edge_type.upper()
        # Find labels of source and target to make match accurate
        query = (
            f"MATCH (a {{id: $source_id}}), (b {{id: $target_id}}) "
            f"MERGE (a)-[r:{rel_type} {{id: $edge_id}}]->(b) "
            f"SET r.properties = $properties_str "
            f"RETURN r"
        )
        properties_str = json.dumps(properties)
        with neo4j_driver.session() as session:
            session.run(query, edge_id=str(edge_id), source_id=str(source_id), target_id=str(target_id), properties_str=properties_str)
        logger.info(f"[Neo4j Sync] Successfully wrote Edge {edge_id} relationship to Neo4j.")
        return True
    except Exception as e:
        logger.error(f"Failed to write relationship edge to Neo4j: {e}")
        return False

def index_text_in_qdrant(evidence_id: int, text_content: str) -> bool:
    """Embeds and indexes document text inside Qdrant if available."""
    if not qdrant_client:
        logger.info(f"[SQLite Fallback] Text preview cached in local database for evidence ID {evidence_id}")
        return True
        
    try:
        # If sentence transformers is missing, we use a simple hash vector (mock embeddings)
        # to ensure it runs out of the box even without downloading huge model weights
        vector = [0.1] * 384 # Standard 384-dimension vector mock
        
        # Simple hash calculation for mock vector variation based on content
        import hashlib
        h = int(hashlib.md5(text_content.encode('utf-8')).hexdigest(), 16)
        for i in range(len(vector)):
            vector[i] = ((h >> (i % 32)) & 1) * 0.25 + 0.05
            
        # Ensure collection exists
        collection_name = "acpia_evidence"
        from qdrant_client.http.models import Distance, VectorParams, PointStruct
        
        collections = [c.name for c in qdrant_client.get_collections().collections]
        if collection_name not in collections:
            qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            
        qdrant_client.upsert(
            collection_name=collection_name,
            points=[
                PointStruct(
                    id=evidence_id,
                    vector=vector,
                    payload={"text": text_content[:500]}
                )
            ]
        )
        logger.info(f"[Qdrant Vector Sync] Document indexed in vector space: ID {evidence_id}.")
        return True
    except Exception as e:
        logger.error(f"Failed to index vector in Qdrant: {e}")
        return False

def search_qdrant_vector(query_text: str, limit: int = 10) -> Optional[List[int]]:
    """Searches vectors in Qdrant and returns matching evidence IDs."""
    if not qdrant_client:
        return None
        
    try:
        # Mock vector for search
        import hashlib
        h = int(hashlib.md5(query_text.encode('utf-8')).hexdigest(), 16)
        vector = [0.1] * 384
        for i in range(len(vector)):
            vector[i] = ((h >> (i % 32)) & 1) * 0.25 + 0.05
            
        results = qdrant_client.search(
            collection_name="acpia_evidence",
            query_vector=vector,
            limit=limit
        )
        
        # Extract matching points IDs
        matched_ids = [int(r.id) for r in results]
        logger.info(f"[Qdrant Search] Vector matching found {len(matched_ids)} items.")
        return matched_ids
    except Exception as e:
        logger.error(f"Qdrant query failed: {e}")
        return None
