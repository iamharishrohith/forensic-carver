import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from sqlalchemy.orm import Session
from .. import models

def generate_forensic_report(db: Session, case_id: int) -> io.BytesIO:
    # 1. Fetch all case information
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    evidence_list = db.query(models.Evidence).filter(models.Evidence.case_id == case_id).all()
    timeline_events = db.query(models.TimelineEvent).filter(models.TimelineEvent.case_id == case_id).order_by(models.TimelineEvent.timestamp.asc()).all()
    entities = db.query(models.EntityNode).filter(models.EntityNode.case_id == case_id, models.EntityNode.status == "approved").all()
    audit_logs = db.query(models.AuditLog).filter(models.AuditLog.case_id == case_id).order_by(models.AuditLog.timestamp.desc()).all()
    
    # Check case level risk (Agent 7)
    risk_dec = db.query(models.AgentDecision).join(models.Evidence).filter(
        models.Evidence.case_id == case_id,
        models.AgentDecision.agent_name.like("%Risk Assessment Agent%")
    ).first()
    
    risk_level = "Low"
    if risk_dec:
        if "Critical" in risk_dec.decision: risk_level = "Critical"
        elif "High" in risk_dec.decision: risk_level = "High"
        elif "Medium" in risk_dec.decision: risk_level = "Medium"

    # Setup document buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#8b5cf6'), # ACPIA purple
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#18181b'),
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#3f3f46')
    )

    mono_style = ParagraphStyle(
        'ReportMono',
        parent=styles['BodyText'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#27272a')
    )

    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['BodyText'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    story = []
    
    # ------------------ COVER PAGE / HEADER ------------------
    story.append(Paragraph("ACPIA FORENSIC CASE REPORT", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC)", body_style))
    story.append(Spacer(1, 15))
    
    # Case Details Table
    case_details = [
        [Paragraph("<b>Investigation Case ID:</b>", body_style), Paragraph(str(case.id), body_style)],
        [Paragraph("<b>Case Name:</b>", body_style), Paragraph(case.name, body_style)],
        [Paragraph("<b>Description:</b>", body_style), Paragraph(case.description or "N/A", body_style)],
        [Paragraph("<b>Case Created:</b>", body_style), Paragraph(case.created_at.strftime('%Y-%m-%d %H:%M:%S'), body_style)],
        [Paragraph("<b>Urgency Threat Level:</b>", body_style), Paragraph(f"<font color='{ 'red' if risk_level in ['Critical', 'High'] else 'green' }'><b>{risk_level.upper()}</b></font>", body_style)]
    ]
    
    t1 = Table(case_details, colWidths=[2.0 * inch, 4.5 * inch])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f4f4f5')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
    ]))
    story.append(t1)
    story.append(Spacer(1, 20))
    
    # ------------------ SECTION 1: EVIDENCE FILES ------------------
    story.append(Paragraph("1. Digital Evidence Inventory & Integrity Hashes", h1_style))
    story.append(Paragraph("All evidence uploads calculate SHA-256 checksums at ingest to preserve legal chain of custody.", body_style))
    story.append(Spacer(1, 8))
    
    evidence_data = [[Paragraph("File Name", header_style), Paragraph("Type", header_style), Paragraph("SHA-256 Checksum", header_style)]]
    for ev in evidence_list:
        evidence_data.append([
            Paragraph(ev.filename, body_style),
            Paragraph(ev.file_type, body_style),
            Paragraph(ev.sha256, mono_style)
        ])
        
    t_ev = Table(evidence_data, colWidths=[1.8 * inch, 1.2 * inch, 3.5 * inch])
    t_ev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#18181b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#fafafa')),
    ]))
    story.append(t_ev)
    story.append(Spacer(1, 20))
    
    # ------------------ SECTION 2: CHRONOLOGY TIMELINE ------------------
    story.append(Paragraph("2. Chronological Investigation Timeline", h1_style))
    story.append(Paragraph("Reconstructed event logs extracted from device payloads and chat databases.", body_style))
    story.append(Spacer(1, 8))
    
    timeline_data = [[Paragraph("Timestamp", header_style), Paragraph("Type", header_style), Paragraph("Source File", header_style), Paragraph("Event Description", header_style)]]
    for tl in timeline_events:
        timeline_data.append([
            Paragraph(tl.timestamp.strftime('%Y-%m-%d %H:%M:%S'), body_style),
            Paragraph(tl.event_type, body_style),
            Paragraph(tl.source, body_style),
            Paragraph(tl.description, body_style)
        ])
        
    t_tl = Table(timeline_data, colWidths=[1.2 * inch, 0.8 * inch, 1.2 * inch, 3.3 * inch])
    t_tl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#18181b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#fafafa')),
    ]))
    story.append(t_tl)
    story.append(Spacer(1, 20))
    
    # PageBreak for next sections
    story.append(PageBreak())
    
    # ------------------ SECTION 3: KNOWLEDGE GRAPH ENTITIES ------------------
    story.append(Paragraph("3. Extracted Knowledge Graph Entities", h1_style))
    story.append(Paragraph("Approved relational items identifying victim nodes, suspect phone keys, and device identities.", body_style))
    story.append(Spacer(1, 8))
    
    entity_data = [[Paragraph("Entity Name / Key", header_style), Paragraph("Type", header_style), Paragraph("Properties & Source Metadata", header_style)]]
    for ent in entities:
        # Format json properties nicely
        import json
        props = json.loads(ent.properties_json or "{}")
        props_str = ", ".join([f"{k}: {v}" for k, v in props.items()])
        
        entity_data.append([
            Paragraph(ent.name, body_style),
            Paragraph(ent.type, body_style),
            Paragraph(props_str, body_style)
        ])
        
    t_ent = Table(entity_data, colWidths=[2.0 * inch, 1.2 * inch, 3.3 * inch])
    t_ent.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#18181b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#fafafa')),
    ]))
    story.append(t_ent)
    story.append(Spacer(1, 20))
    
    # ------------------ SECTION 4: AUDIT LEDGER ------------------
    story.append(Paragraph("4. Forensic Audit Ledger & Chain of Custody", h1_style))
    story.append(Paragraph("Immutable ledger logs of user actions and automated AI Orchestrator decisions.", body_style))
    story.append(Spacer(1, 8))
    
    audit_data = [[Paragraph("Timestamp", header_style), Paragraph("User", header_style), Paragraph("Action", header_style), Paragraph("Audit Description Details", header_style)]]
    for log in audit_logs[:15]: # Show recent 15
        audit_data.append([
            Paragraph(log.timestamp.strftime('%Y-%m-%d %H:%M:%S'), body_style),
            Paragraph(log.user, body_style),
            Paragraph(log.action, body_style),
            Paragraph(log.details, body_style)
        ])
        
    t_au = Table(audit_data, colWidths=[1.2 * inch, 1.0 * inch, 1.0 * inch, 3.3 * inch])
    t_au.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#18181b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#fafafa')),
    ]))
    story.append(t_au)
    
    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer
