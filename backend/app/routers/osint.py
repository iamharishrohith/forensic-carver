from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json
from ..database import get_db
from .. import models, schemas
from .auth import get_current_user
from ..services.db_adapters import sync_node_to_neo4j, sync_edge_to_neo4j

router = APIRouter(prefix="/osint", tags=["osint"])

# Simulated OSINT Database
OSINT_REGISTRY = {
    "suspect_alpha@shadow.com": [
        {"platform": "Instagram", "username": "alpha_shadow_99", "profile_url": "https://instagram.com/alpha_shadow_99", "details": "Private account. 430 followers. Bio: 'Live free. Chennai local.'", "linked_locations": "Chennai, TN"},
        {"platform": "Twitter/X", "username": "shadow_alpha", "profile_url": "https://x.com/shadow_alpha", "details": "Active. 12 tweets. Last post mentions: 'Heading to the marina beach near the high school.'", "linked_locations": "Chennai"},
        {"platform": "GitHub", "username": "alpha-coder-99", "profile_url": "https://github.com/alpha-coder-99", "details": "1 public repo: 'chat-scratcher'. Language: Python. Email matches suspect address.", "linked_locations": None}
    ],
    "+91 98765 43210": [
        {"platform": "Truecaller", "username": "Kamal Kumar", "profile_url": "#", "details": "Carrier: Airtel. Region: Tamil Nadu, India. Flagged by 4 users as spam/suspicious.", "linked_locations": "Chennai, India"},
        {"platform": "Telegram", "username": "kamal_talks", "profile_url": "https://t.me/kamal_talks", "details": "Bio: 'Reach out here. DM for private chats.' Last seen online recently.", "linked_locations": None}
    ],
    "kamal": [
        {"platform": "Facebook", "username": "Kamal.Kumar.Forensics", "profile_url": "https://facebook.com/Kamal.Kumar.Forensics", "details": "Public profile. Lives in Chennai. Works in Sales.", "linked_locations": "Chennai, India"}
    ]
}

@router.get("/scan")
def scan_osint(
    q: str = Query(..., description="Query key (phone, email, or username)"),
):
    q_lower = q.lower()
    results = []
    
    # Simple check for matches
    for key, profiles in OSINT_REGISTRY.items():
        if key in q_lower or q_lower in key:
            results.extend(profiles)
            
    # Default mock results if no exact match, so search is always functional
    if not results:
        results = [
            {
                "platform": "WHOIS Registry",
                "username": f"domain_search_{q_lower}",
                "profile_url": "#",
                "details": f"No public profiles. Domain registrars scan matching keyword '{q}' logged as inactive.",
                "linked_locations": None
            },
            {
                "platform": "General Web Index",
                "username": f"mention_{q_lower}",
                "profile_url": "#",
                "details": f"Index scanner matched 3 public web occurrences of keyword '{q}'.",
                "linked_locations": None
            }
        ]
        
    return {
        "query": q,
        "results": results
    }

@router.post("/{case_id}/import")
def import_osint_node(
    case_id: int,
    platform: str,
    username: str,
    details: str,
    linked_locations: str = None,
    origin_query: str = Query(None, description="The phone, email, or handle queried"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 1. Create the Account Node
    node_name = f"{platform} Profile: @{username}"
    db_node = models.EntityNode(
        case_id=case_id,
        name=node_name,
        type="Account",
        properties_json=json.dumps({
            "platform": platform,
            "username": username,
            "osint_details": details,
            "extracted_locations": linked_locations or "N/A",
            "source": "OSINT Expansion Scanner"
        }),
        status="approved"
    )
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    
    # Sync Account Node to Neo4j
    sync_node_to_neo4j(db_node.id, db_node.name, db_node.type, json.loads(db_node.properties_json))
    
    created_edges_details = []
    
    # 2. Check origin query to link to existing entities (Truecaller mapping, Phone/Email ownerships)
    if origin_query:
        match_phone = db.query(models.EntityNode).filter(
            models.EntityNode.case_id == case_id,
            models.EntityNode.name == origin_query,
            models.EntityNode.type == "Phone"
        ).first()
        
        match_email = db.query(models.EntityNode).filter(
            models.EntityNode.case_id == case_id,
            models.EntityNode.name == origin_query,
            models.EntityNode.type == "Email"
        ).first()
        
        if match_phone:
            if platform == "Truecaller":
                # Create a Person node representing the Truecaller owner name
                person_node = models.EntityNode(
                    case_id=case_id,
                    name=username,
                    type="Person",
                    properties_json=json.dumps({"origin": "Truecaller contact mapping", "carrier_details": details}),
                    status="approved"
                )
                db.add(person_node)
                db.commit()
                db.refresh(person_node)
                
                sync_node_to_neo4j(person_node.id, person_node.name, person_node.type, json.loads(person_node.properties_json))
                
                # Edge 1: Person OWNS Phone
                edge1 = models.EntityEdge(
                    case_id=case_id,
                    source_id=person_node.id,
                    target_id=match_phone.id,
                    type="OWNS",
                    status="approved"
                )
                db.add(edge1)
                
                # Edge 2: Person OWNS Account
                edge2 = models.EntityEdge(
                    case_id=case_id,
                    source_id=person_node.id,
                    target_id=db_node.id,
                    type="OWNS",
                    status="approved"
                )
                db.add(edge2)
                db.commit()
                db.refresh(edge1)
                db.refresh(edge2)
                
                sync_edge_to_neo4j(edge1.id, edge1.source_id, edge1.target_id, edge1.type, {})
                sync_edge_to_neo4j(edge2.id, edge2.source_id, edge2.target_id, edge2.type, {})
                created_edges_details.append(f"Linked Phone '{origin_query}' --(OWNS)--> Owner Person '{username}' --(OWNS)--> Profile")
            else:
                # Direct link: Phone --OWNS--> Account Profile
                edge = models.EntityEdge(
                    case_id=case_id,
                    source_id=match_phone.id,
                    target_id=db_node.id,
                    type="OWNS",
                    status="approved"
                )
                db.add(edge)
                db.commit()
                db.refresh(edge)
                sync_edge_to_neo4j(edge.id, edge.source_id, edge.target_id, edge.type, {})
                created_edges_details.append(f"Linked Phone '{origin_query}' --(OWNS)--> Account Profile")
                
        elif match_email:
            # Direct link: Email --OWNS--> Account Profile
            edge = models.EntityEdge(
                case_id=case_id,
                source_id=match_email.id,
                target_id=db_node.id,
                type="OWNS",
                status="approved"
            )
            db.add(edge)
            db.commit()
            db.refresh(edge)
            sync_edge_to_neo4j(edge.id, edge.source_id, edge.target_id, edge.type, {})
            created_edges_details.append(f"Linked Email '{origin_query}' --(OWNS)--> Account Profile")

    # 3. Handle linked locations (Account --LOCATED_AT--> Location Node)
    if linked_locations and linked_locations != "N/A":
        loc_node = db.query(models.EntityNode).filter(
            models.EntityNode.case_id == case_id,
            models.EntityNode.name == linked_locations,
            models.EntityNode.type == "Location"
        ).first()
        
        if not loc_node:
            loc_node = models.EntityNode(
                case_id=case_id,
                name=linked_locations,
                type="Location",
                properties_json=json.dumps({"origin": "OSINT location metadata extract"}),
                status="approved"
            )
            db.add(loc_node)
            db.commit()
            db.refresh(loc_node)
            sync_node_to_neo4j(loc_node.id, loc_node.name, loc_node.type, json.loads(loc_node.properties_json))
            
        edge = models.EntityEdge(
            case_id=case_id,
            source_id=db_node.id,
            target_id=loc_node.id,
            type="LOCATED_AT",
            status="approved"
        )
        db.add(edge)
        db.commit()
        db.refresh(edge)
        sync_edge_to_neo4j(edge.id, edge.source_id, edge.target_id, edge.type, {})
        created_edges_details.append(f"Linked Profile --(LOCATED_AT)--> Location '{linked_locations}'")
        
        # Write location timeline event
        from datetime import datetime
        tl_event = models.TimelineEvent(
            case_id=case_id,
            timestamp=datetime.utcnow(),
            event_type="Location",
            description=f"OSINT spatial track: Profile @{username} activity detected at location '{linked_locations}'. Details: '{details[:80]}...'",
            source=f"OSINT: {platform}",
            location_gps="13.0827,80.2707"  # Default Chennai coordinates for mock pings rendering
        )
        db.add(tl_event)
        db.commit()

    # 4. Final log & audit records
    edges_log = " | ".join(created_edges_details) if created_edges_details else "Imported isolated profile."
    audit = models.AuditLog(
        case_id=case_id,
        user=current_user.username,
        action="CREATE_NODE",
        details=f"OSINT intelligence import: Mapped online profile @{username} on {platform}. Relations generated: {edges_log}."
    )
    db.add(audit)
    db.commit()
    
    return {
        "status": "success",
        "node_id": db_node.id,
        "name": db_node.name,
        "relations_logged": created_edges_details
    }
