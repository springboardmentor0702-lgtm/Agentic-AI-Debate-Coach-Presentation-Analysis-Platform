WEIGHTS={"argument_quality":.30,"evidence_usage":.20,"logical_consistency":.20,"rebuttal_effectiveness":.15,"communication_skills":.15}

def score_presentation_content(metrics):
    values=[metrics.get("argument_quality",0),metrics.get("logical_consistency",0),metrics.get("rebuttal_effectiveness",0)]
    overall=round(sum(values)/len(values),2)
    return {**metrics,"overall":overall,"critical_thinking":round((values[0]+values[1])/2,2),"persuasiveness":round((values[0]+values[2])/2,2)}

def score_debate(metrics):
    overall=round(sum(metrics.get(k,0)*w for k,w in WEIGHTS.items()),2)
    return {**metrics,"overall":overall,
        "critical_thinking":round((metrics.get("argument_quality",0)+metrics.get("logical_consistency",0))/2,2),
        "persuasiveness":round((metrics.get("argument_quality",0)+metrics.get("rebuttal_effectiveness",0))/2,2),
        "clarity":metrics.get("clarity"),
        "confidence":metrics.get("confidence")}
