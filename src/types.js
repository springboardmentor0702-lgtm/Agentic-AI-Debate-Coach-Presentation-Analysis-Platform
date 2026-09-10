/**
 * MindArena AI Types & Contracts
 * @typedef {'learner' | 'coach' | 'educator' | 'admin'} UserRole
 * @typedef {'beginner' | 'intermediate' | 'advanced' | 'expert'} ExperienceLevel
 */

export const USER_ROLES = ['learner', 'coach', 'educator', 'admin'];
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} username
 * @property {UserRole} role
 * @property {ExperienceLevel} experience_level
 * @property {boolean} participate_in_comparison
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} AuthState
 * @property {UserProfile|null} user
 * @property {string|null} token
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 */

/**
 * @typedef {Object} Claim
 * @property {string} claim
 * @property {'premise' | 'conclusion' | 'counterclaim'} type
 * @property {string} validity
 */

/**
 * @typedef {Object} Fallacy
 * @property {string} name
 * @property {string} explanation
 * @property {'low' | 'medium' | 'high'} severity
 * @property {string} [quote]
 * @property {string} [correction]
 */

/**
 * @typedef {Object} Counterargument
 * @property {string} angle
 * @property {string} refutation
 * @property {string} [vulnerability]
 * @property {string} [rebuttal_technique]
 */

/**
 * @typedef {Object} ArgumentAnalysisRecord
 * @property {string} id
 * @property {string} user_id
 * @property {string} topic
 * @property {string} argument
 * @property {number} overall_score
 * @property {Claim[]} claims
 * @property {number} evidence_quality
 * @property {string} evidence_analysis
 * @property {number} logical_strength
 * @property {string} logical_structure
 * @property {Fallacy[]} fallacies
 * @property {Counterargument[]} counterarguments
 * @property {string[]} strengths
 * @property {string[]} weaknesses
 * @property {string[]} recommendations
 * @property {string} created_at
 */

/**
 * @typedef {Object} JudgeFeedback
 * @property {number} relevance
 * @property {number} evidence
 * @property {number} logic
 * @property {number} rebuttal
 * @property {number} clarity
 * @property {number} persuasiveness
 * @property {number} overall_score
 * @property {string[]} feedback
 * @property {string} [winning_edge]
 */

/**
 * @typedef {Object} DebateRound
 * @property {number} round_number
 * @property {string} [user_speech]
 * @property {string} [opponent_speech]
 * @property {string} [speaker_name]
 * @property {JudgeFeedback} [judge_feedback]
 * @property {string} created_at
 */

/**
 * @typedef {Object} DebateSession
 * @property {string} id
 * @property {string} user_id
 * @property {string} user_name
 * @property {string|null} [opponent_id]
 * @property {string} opponent_name
 * @property {string} topic
 * @property {'ai' | 'human'} mode
 * @property {'pro' | 'con'} user_stance
 * @property {'pro' | 'con'} opponent_stance
 * @property {'pending' | 'accepted' | 'rejected' | 'completed'} invite_status
 * @property {'active' | 'completed'} status
 * @property {number} current_round
 * @property {number} max_rounds
 * @property {DebateRound[]} rounds
 * @property {Object} [final_verdict]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ResearchSource
 * @property {string} title
 * @property {string} snippet
 * @property {string} url
 */

/**
 * @typedef {Object} ResearchBrief
 * @property {string} id
 * @property {string} user_id
 * @property {string} topic
 * @property {number} iterations
 * @property {string[]} query_history
 * @property {ResearchSource[]} sources
 * @property {Object} brief
 * @property {string} created_at
 */

/**
 * @typedef {Object} CoachingSession
 * @property {string} id
 * @property {string} user_id
 * @property {string} question
 * @property {string[]} tools_used
 * @property {any} tool_results
 * @property {string} final_recommendation
 * @property {Object} [proposed_goal]
 * @property {string[]} strengths
 * @property {string[]} weaknesses
 * @property {string[]} recommendations
 * @property {string} created_at
 */

/**
 * @typedef {Object} PresentationRecord
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string} transcript
 * @property {number} duration_seconds
 * @property {number} word_count
 * @property {number} words_per_minute
 * @property {Object} pace
 * @property {{word: string, count: number}[]} filler_words
 * @property {number} clarity_score
 * @property {number} confidence_score
 * @property {number} structure_score
 * @property {string[]} recommendations
 * @property {string} created_at
 */

/**
 * @typedef {Object} Goal
 * @property {string} id
 * @property {string} user_id
 * @property {string|null} [assigned_by]
 * @property {string} title
 * @property {string} metric
 * @property {number} target_value
 * @property {number} current_value
 * @property {'active' | 'completed' | 'in_progress'} status
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Classroom
 * @property {string} id
 * @property {string} created_by
 * @property {string} name
 * @property {string} description
 * @property {string} created_at
 */

/**
 * @typedef {Object} NotificationItem
 * @property {string} id
 * @property {string} user_id
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {string} [link]
 * @property {boolean} is_read
 * @property {string} created_at
 */

export default {
  USER_ROLES,
  EXPERIENCE_LEVELS
};
