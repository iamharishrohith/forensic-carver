from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json
from ..database import get_db
from .. import models, schemas
from ..services.db_adapters import sync_node_to_neo4j, sync_edge_to_neo4j
from .auth import get_current_user

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/{case_id}")
def get_case_graph(case_id: int, db: Session = Depends(get_db)):
    nodes = db.query(models.EntityNode).filter(
        models.EntityNode.case_id == case_id,
        models.EntityNode.status == "approved"
    ).all()
    
    edges = db.query(models.EntityEdge).filter(
        models.EntityEdge.case_id == case_id,
        models.EntityEdge.status == "approved"
    ).all()
    
    serialized_nodes = []
    for n in nodes:
        props = json.loads(n.properties_json or "{}")
        serialized_nodes.append({
            "id": str(n.id),
            "label": n.name,
            "type": n.type,
            "properties": props
        })
        
    serialized_edges = []
    for e in edges:
        props = json.loads(e.properties_json or "{}")
        serialized_edges.append({
            "id": f"e{e.id}",
            "source": str(e.source_id),
            "target": str(e.target_id),
            "type": e.type,
            "properties": props
        })
        
    return {
        "nodes": serialized_nodes,
        "edges": serialized_edges
    }

@router.post("/{case_id}/nodes", response_model=schemas.EntityNodeResponse)
def add_custom_node(
    case_id: int,
    node: schemas.EntityNodeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_node = models.EntityNode(
        case_id=case_id,
        name=node.name,
        type=node.type,
        properties_json=node.properties_json or "{}",
        status="approved"
    )
    db.add(db_node)
    
    # Audit log
    audit = models.AuditLog(
        case_id=case_id,
        user=current_user.username,
        action="CREATE_NODE",
        details=f"Manually created node: {node.name} ({node.type})"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_node)
    
    # Sync node to Neo4j database
    sync_node_to_neo4j(db_node.id, db_node.name, db_node.type, json.loads(db_node.properties_json))
    
    return db_node

@router.post("/{case_id}/edges", response_model=schemas.EntityEdgeResponse)
def add_custom_edge(
    case_id: int,
    edge: schemas.EntityEdgeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify nodes exist
    src = db.query(models.EntityNode).filter(models.EntityNode.id == edge.source_id).first()
    tgt = db.query(models.EntityNode).filter(models.EntityNode.id == edge.target_id).first()
    
    if not src or not tgt:
        raise HTTPException(status_code=404, detail="Source or target node not found")
        
    db_edge = models.EntityEdge(
        case_id=case_id,
        source_id=edge.source_id,
        target_id=edge.target_id,
        type=edge.type,
        properties_json=edge.properties_json or "{}",
        status="approved"
    )
    db.add(db_edge)
    
    # Audit log
    audit = models.AuditLog(
        case_id=case_id,
        user=current_user.username,
        action="CREATE_EDGE",
        details=f"Manually linked {src.name} --({edge.type})--> {tgt.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_edge)
    
    # Sync edge to Neo4j database
    sync_edge_to_neo4j(db_edge.id, db_edge.source_id, db_edge.target_id, db_edge.type, json.loads(db_edge.properties_json))
    
    return db_edge
