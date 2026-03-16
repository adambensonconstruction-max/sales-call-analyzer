"""Practice service for roleplay and coaching."""
import logging
from typing import Dict, Any, List, Optional

from config import config
from providers.supabase import get_supabase_admin_client
from providers.openai_client import OpenAIProvider
from utils.prompts import build_practice_prompt

logger = logging.getLogger(__name__)


class PracticeService:
    """Service for practice sessions and roleplay."""
    
    def __init__(self):
        """Initialize practice service."""
        self.openai = OpenAIProvider()
        self.supabase = get_supabase_admin_client()
    
    def create_session(
        self,
        user_id: str,
        practice_type: str,
        difficulty: str = 'intermediate',
        scenario_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new practice session.
        
        Args:
            user_id: The user ID.
            practice_type: Type of practice (roleplay, objection_handling, etc.).
            difficulty: Difficulty level.
            scenario_config: Optional scenario configuration.
            
        Returns:
            Created session data.
        """
        # Generate scenario
        scenario = self._generate_scenario(practice_type, difficulty, scenario_config)
        
        record = {
            'user_id': user_id,
            'type': practice_type,
            'difficulty': difficulty,
            'scenario': scenario,
            'messages': [],
            'completed': False
        }
        
        result = self.supabase.table('practice_sessions').insert(record).execute()
        session = result.data[0]
        
        logger.info(f"Created practice session {session['id']} for user {user_id}")
        return session
    
    def _generate_scenario(
        self,
        practice_type: str,
        difficulty: str,
        config: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate a practice scenario.
        
        Args:
            practice_type: Type of practice.
            difficulty: Difficulty level.
            config: Optional configuration.
            
        Returns:
            Scenario data.
        """
        # For now, return basic scenario
        # In production, this could use AI to generate scenarios
        scenarios = {
            'roleplay': {
                'title': 'Kitchen Renovation Consultation',
                'description': 'A homeowner is interested in renovating their kitchen. They have a budget of $30,000 and want modern appliances.',
                'customer_profile': {
                    'name': 'Sarah Johnson',
                    'budget': '$30,000',
                    'timeline': '3 months',
                    'concerns': ['quality', 'timeline', 'disruption']
                }
            },
            'objection_handling': {
                'title': 'Price Objection',
                'description': 'The customer loves the proposal but says the price is too high compared to a competitor.',
                'objection': 'Your quote is 20% higher than Company X',
                'context': 'Bathroom remodel, $15,000 quote'
            },
            'discovery': {
                'title': 'Needs Assessment',
                'description': 'Uncover the true needs and pain points of a potential client.',
                'focus': 'pain_points_and_motivations'
            }
        }
        
        return scenarios.get(practice_type, {
            'title': 'Practice Session',
            'description': 'General sales practice'
        })
    
    def get_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Get practice session.
        
        Args:
            session_id: The session ID.
            user_id: The user ID (for authorization).
            
        Returns:
            Session data.
        """
        result = self.supabase.table('practice_sessions').select('*').eq('id', session_id).eq('user_id', user_id).single().execute()
        
        if not result.data:
            raise ValueError(f"Session {session_id} not found")
        
        return result.data
    
    def add_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str
    ) -> Dict[str, Any]:
        """Add message to practice session.
        
        Args:
            session_id: The session ID.
            user_id: The user ID.
            role: 'user' or 'assistant'.
            content: Message content.
            
        Returns:
            Updated session.
        """
        session = self.get_session(session_id, user_id)
        
        messages = session.get('messages', [])
        messages.append({
            'role': role,
            'content': content,
            'timestamp': 'now()'  # Will be handled by DB
        })
        
        result = self.supabase.table('practice_sessions').update({
            'messages': messages
        }).eq('id', session_id).execute()
        
        return result.data[0]
    
    def generate_response(
        self,
        session_id: str,
        user_id: str,
        user_message: str
    ) -> Dict[str, Any]:
        """Generate AI response in practice session.
        
        Args:
            session_id: The session ID.
            user_id: The user ID.
            user_message: User's message.
            
        Returns:
            AI response and updated session.
        """
        session = self.get_session(session_id, user_id)
        
        # Build prompt
        messages = build_practice_prompt(
            session['type'],
            session['scenario'],
            session.get('messages', []),
            user_message
        )
        
        # Generate response
        response = self.openai.chat_completion(
            messages=messages,
            model=config.OPENAI_COACHING_MODEL,
            temperature=0.7
        )
        
        ai_message = response['content']
        
        # Add messages to session
        self.add_message(session_id, user_id, 'user', user_message)
        self.add_message(session_id, user_id, 'assistant', ai_message)
        
        return {
            'response': ai_message,
            'session_id': session_id
        }
    
    def get_feedback(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Get AI feedback on practice session.
        
        Args:
            session_id: The session ID.
            user_id: The user ID.
            
        Returns:
            Feedback data.
        """
        session = self.get_session(session_id, user_id)
        messages = session.get('messages', [])
        
        if not messages:
            return {'error': 'No messages to evaluate'}
        
        # Build feedback prompt
        feedback_prompt = f"""Analyze this sales practice session and provide constructive feedback.

Scenario: {session['scenario'].get('title', 'Practice Session')}
Type: {session['type']}
Difficulty: {session['difficulty']}

Conversation:
"""
        for msg in messages:
            role = 'Sales Rep' if msg['role'] == 'user' else 'Customer'
            feedback_prompt += f"\n{role}: {msg['content']}"
        
        feedback_prompt += """

Provide feedback in JSON format with these fields:
- overall_score (0-100)
- strengths (array of strings)
- areas_for_improvement (array of strings)
- specific_examples (array of objects with {moment, what_you_did, better_approach})
- actionable_tips (array of strings)
"""
        
        response = self.openai.chat_completion(
            messages=[
                {'role': 'system', 'content': 'You are an expert sales coach providing constructive feedback.'},
                {'role': 'user', 'content': feedback_prompt}
            ],
            model=config.OPENAI_ANALYSIS_MODEL,
            temperature=0.3,
            response_format={'type': 'json_object'}
        )
        
        import json
        feedback = json.loads(response['content'])
        
        # Update session with feedback
        self.supabase.table('practice_sessions').update({
            'feedback': feedback,
            'score': feedback.get('overall_score'),
            'completed': True
        }).eq('id', session_id).execute()
        
        return feedback
