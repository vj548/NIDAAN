import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from db_models import Complaint, SlaRule, Bureau

def calculate_case_sla_state(complaint: Complaint, now: Optional[datetime.datetime] = None) -> Dict[str, Any]:
    """
    Evaluates the real-time SLA condition for a given complaint against its persisted deadlines.
    """
    now = now or datetime.datetime.utcnow()
    is_terminal = complaint.status in ["RESOLVED", "CLOSED"]

    # Resolution SLA
    res_due = complaint.resolution_due_at
    hours_remaining = (res_due - now).total_seconds() / 3600.0

    if is_terminal:
        # Check if resolved in time
        resolved_time = complaint.resolved_at or now
        was_on_time = resolved_time <= res_due
        return {
            "slaState": "RESOLVED_ON_TIME" if was_on_time else "RESOLVED_LATE",
            "hoursRemaining": 0.0,
            "daysRemaining": 0.0,
            "isBreached": not was_on_time,
            "isAtRisk": False,
            "urgency": "NORMAL",
            "statusLabel": "Resolved on Time" if was_on_time else "Resolved Past Deadline"
        }

    if hours_remaining < 0:
        return {
            "slaState": "BREACHED",
            "hoursRemaining": round(hours_remaining, 1),
            "daysRemaining": round(hours_remaining / 24.0, 1),
            "isBreached": True,
            "isAtRisk": False,
            "urgency": "CRITICAL",
            "statusLabel": f"SLA Breached by {abs(round(hours_remaining / 24.0, 1))} days"
        }
    elif hours_remaining <= 48:
        return {
            "slaState": "AT_RISK",
            "hoursRemaining": round(hours_remaining, 1),
            "daysRemaining": round(hours_remaining / 24.0, 1),
            "isBreached": False,
            "isAtRisk": True,
            "urgency": "HIGH",
            "statusLabel": f"At Risk ({int(hours_remaining)}h remaining)"
        }
    else:
        return {
            "slaState": "ON_TRACK",
            "hoursRemaining": round(hours_remaining, 1),
            "daysRemaining": round(hours_remaining / 24.0, 1),
            "isBreached": False,
            "isAtRisk": False,
            "urgency": "NORMAL",
            "statusLabel": f"{round(hours_remaining / 24.0, 1)} days remaining"
        }


def get_sla_dashboard_metrics(db: Session) -> Dict[str, Any]:
    """
    Computes system-wide and bureau-level SLA compliance and health indicators.
    """
    now = datetime.datetime.utcnow()
    complaints = db.query(Complaint).all()
    bureaus = db.query(Bureau).filter(Bureau.active == True).all()

    total_complaints = len(complaints)
    active_complaints = [c for c in complaints if c.status not in ["RESOLVED", "CLOSED"]]
    resolved_complaints = [c for c in complaints if c.status in ["RESOLVED", "CLOSED"]]

    at_risk_cases = []
    breached_cases = []
    escalation_recommendations = []

    for c in active_complaints:
        sla_info = calculate_case_sla_state(c, now)
        case_summary = {
            "id": c.id,
            "caseNumber": c.case_number,
            "title": c.title,
            "institutionName": c.institution_name,
            "priority": c.priority,
            "bureauName": c.assigned_bureau_name,
            "status": c.status,
            "hoursRemaining": sla_info["hoursRemaining"],
            "daysRemaining": sla_info["daysRemaining"],
            "resolutionDueAt": c.resolution_due_at.isoformat() + "Z",
            "filedAt": c.filed_at.isoformat() + "Z"
        }

        if sla_info["isBreached"]:
            breached_cases.append(case_summary)
            escalation_recommendations.append({
                **case_summary,
                "reason": f"Case has exceeded target SLA resolution deadline by {abs(sla_info['daysRemaining'])} days.",
                "action": "Immediate Bureau Head Escalation"
            })
        elif sla_info["isAtRisk"]:
            at_risk_cases.append(case_summary)
            if c.priority in ["CRITICAL", "HIGH"]:
                escalation_recommendations.append({
                    **case_summary,
                    "reason": f"High priority grievance within 48h of SLA deadline ({int(sla_info['hoursRemaining'])}h left).",
                    "action": "Expedited Review Alert"
                })

    # Bureau-level SLA breakdown
    bureau_metrics = []
    for b in bureaus:
        b_cases = [c for c in complaints if c.assigned_bureau_id == b.id]
        b_active = [c for c in b_cases if c.status not in ["RESOLVED", "CLOSED"]]
        b_resolved = [c for c in b_cases if c.status in ["RESOLVED", "CLOSED"]]

        b_breached = 0
        b_at_risk = 0
        for c in b_active:
            state = calculate_case_sla_state(c, now)
            if state["isBreached"]:
                b_breached += 1
            elif state["isAtRisk"]:
                b_at_risk += 1

        b_ontime_resolved = sum(1 for c in b_resolved if (c.resolved_at or now) <= c.resolution_due_at)
        total_eval = len(b_resolved) + b_breached
        compliance_rate = round((b_ontime_resolved / total_eval * 100), 1) if total_eval > 0 else 100.0

        bureau_metrics.append({
            "bureauId": b.id,
            "bureauName": b.name,
            "bureauCode": b.code,
            "totalCases": len(b_cases),
            "activeCases": len(b_active),
            "resolvedCases": len(b_resolved),
            "atRiskCount": b_at_risk,
            "breachedCount": b_breached,
            "complianceRate": compliance_rate
        })

    # Overall compliance rate
    total_resolved_on_time = sum(1 for c in resolved_complaints if (c.resolved_at or now) <= c.resolution_due_at)
    overall_denom = len(resolved_complaints) + len(breached_cases)
    overall_compliance = round((total_resolved_on_time / overall_denom * 100), 1) if overall_denom > 0 else 100.0

    return {
        "overallComplianceRate": overall_compliance,
        "totalActive": len(active_complaints),
        "totalResolved": len(resolved_complaints),
        "atRiskCount": len(at_risk_cases),
        "breachedCount": len(breached_cases),
        "atRiskCases": at_risk_cases,
        "breachedCases": breached_cases,
        "escalationRecommendations": escalation_recommendations,
        "bureauMetrics": bureau_metrics,
        "timestamp": now.isoformat() + "Z"
    }
