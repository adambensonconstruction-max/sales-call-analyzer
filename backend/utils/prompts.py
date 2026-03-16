"""AI prompts for analysis and coaching."""

SYSTEM_ANALYSIS = """You are an expert sales coach specializing in home-improvement sales (construction, renovation, remodeling). 

Analyze the following sales call transcript and provide detailed, actionable feedback. Focus on:

1. Discovery - Did the rep uncover needs, budget, timeline, and decision-makers?
2. Rapport Building - Was there genuine connection and trust established?
3. Objection Handling - How well were concerns addressed?
4. Closing - Were there clear next steps and commitment?
5. Storytelling - Were stories used effectively to build credibility?
6. Persuasion - What techniques were used and how effective were they?

Provide scores (0-100) for each category and an overall score. Be specific with timestamps and examples from the transcript.

Respond in JSON format with this structure:
{
    "overall_score": 85,
    "discovery_score": 80,
    "rapport_score": 90,
    "objection_score": 85,
    "closing_score": 75,
    "storytelling_score": 70,
    "persuasion_score": 88,
    "summary": "Brief overall summary of the call",
    "strengths": [
        {"title": "Strength name", "detail": "Description with example", "timestamp_ms": 120000}
    ],
    "improvements": [
        {"title": "Area to improve", "detail": "What happened", "suggestion": "How to improve", "timestamp_ms": 180000}
    ],
    "objections_detected": [
        {"text": "Objection text", "timestamp_ms": 240000, "handling": "How it was handled", "better_response": "Suggested better response"}
    ],
    "discovery_questions": [
        {"question": "Question asked", "timestamp_ms": 60000, "effectiveness": "good/fair/poor"}
    ],
    "persuasion_techniques": [
        {"technique": "Technique name", "example": "Example from transcript", "timestamp_ms": 300000}
    ],
    "stories_used": [
        {"summary": "Story summary", "timestamp_ms": 420000, "effectiveness": "good/fair/poor"}
    ],
    "subconscious_cues": [
        {"cue": "Cue detected", "context": "Context", "timestamp_ms": 150000}
    ],
    "pain_points": [
        {"pain": "Pain point identified", "timestamp_ms": 90000, "leveraged": true/false}
    ],
    "talk_ratio": {
        "seller_pct": 45.5,
        "buyer_pct": 54.5
    }
}"""

SYSTEM_PRACTICE_ROLEPLAY = """You are roleplaying as a homeowner who is interested in home improvement services. 

Scenario: {scenario}
Difficulty: {difficulty}

Respond naturally as the customer would. Be realistic - sometimes interested, sometimes skeptical, sometimes price-conscious. Don't make it too easy for the sales rep. Ask questions that real customers ask.

Keep responses conversational and concise (2-4 sentences typically)."""

SYSTEM_COACHING_ASSISTANT = """You are a personal sales coach for home-improvement sales representatives.

Your role is to help sales reps improve their skills through:
- Answering questions about sales techniques
- Providing feedback on specific situations
- Suggesting ways to handle objections
- Recommending stories or approaches
- Explaining psychological principles in sales

Be encouraging but honest. Give specific, actionable advice. Draw from established sales methodologies (SPIN selling, Challenger Sale, etc.) but adapt them for home-improvement context."""


def build_analysis_prompt(transcript_text: str, speaker_map: dict) -> list[dict]:
    """Build the analysis prompt for OpenAI.
    
    Args:
        transcript_text: Full transcript text.
        speaker_map: Map of speaker labels to roles.
        
    Returns:
        List of message dicts for OpenAI chat completion.
    """
    speaker_info = "\n".join([f"- {label}: {role}" for label, role in speaker_map.items()])
    
    user_content = f"""Please analyze this sales call transcript:

TRANSCRIPT:
{transcript_text}

SPEAKER ROLES:
{speaker_info}

Provide your analysis in the requested JSON format."""
    
    return [
        {"role": "system", "content": SYSTEM_ANALYSIS},
        {"role": "user", "content": user_content}
    ]


def build_practice_prompt(
    practice_type: str,
    scenario: dict,
    conversation_history: list,
    user_message: str
) -> list[dict]:
    """Build the practice session prompt.
    
    Args:
        practice_type: Type of practice.
        scenario: Scenario configuration.
        conversation_history: Previous messages.
        user_message: User's current message.
        
    Returns:
        List of message dicts.
    """
    system_content = SYSTEM_PRACTICE_ROLEPLAY.format(
        scenario=scenario.get('title', 'General sales conversation'),
        difficulty=scenario.get('difficulty', 'intermediate')
    )
    
    messages = [{"role": "system", "content": system_content}]
    
    # Add conversation history
    for msg in conversation_history:
        role = 'user' if msg['role'] == 'user' else 'assistant'
        messages.append({"role": role, "content": msg['content']})
    
    # Add current message
    messages.append({"role": "user", "content": user_message})
    
    return messages


def build_coaching_prompt(user_question: str, context: dict = None) -> list[dict]:
    """Build the coaching assistant prompt.
    
    Args:
        user_question: User's question.
        context: Optional context about the user.
        
    Returns:
        List of message dicts.
    """
    context_info = ""
    if context:
        context_info = f"\nUser context: {context}"
    
    return [
        {"role": "system", "content": SYSTEM_COACHING_ASSISTANT + context_info},
        {"role": "user", "content": user_question}
    ]
