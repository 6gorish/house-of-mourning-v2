'use client';

/**
 * GriefSubmissionForm
 * Anonymous grief message submission with character counter and validation
 */

import { useState } from 'react';
import { getOrCreateSessionId } from '@/lib/session';

const MAX_LENGTH = 280;

export default function GriefSubmissionForm() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const remainingChars = MAX_LENGTH - content.length;
  const isValid = content.trim().length >= 1 && content.trim().length <= MAX_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Get or create session ID
      const sessionId = getOrCreateSessionId();

      // Submit to API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Your message has been shared. Thank you for contributing your voice.',
        });
        setContent(''); // Clear form
      } else if (response.status === 429) {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'You\'ve reached the submission limit. Please wait before sharing another message.',
        });
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Failed to submit message. Please try again.',
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Textarea */}
        <div>
          <label htmlFor="grief-content" className="sr-only">
            What are you mourning?
          </label>
          <textarea
            id="grief-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What are you mourning?"
            maxLength={MAX_LENGTH}
            rows={6}
            className="w-full px-6 py-4 
                       bg-white border border-stone-200
                       text-base md:text-lg font-light leading-relaxed text-stone-900
                       placeholder:text-stone-400
                       focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent
                       resize-none
                       transition-all duration-200"
            disabled={isSubmitting}
          />

          {/* Character counter */}
          <div className="flex justify-between items-center mt-2 px-2">
            <p className="text-sm text-stone-500">
              A person, a relationship, a version of yourself, a future that won't arrive.
            </p>
            <p
              className={`text-sm font-medium ${
                remainingChars < 0
                  ? 'text-red-600'
                  : remainingChars < 50
                  ? 'text-amber-600'
                  : 'text-stone-500'
              }`}
            >
              {remainingChars} characters remaining
            </p>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? 'Sharing...' : 'Share Your Grief'}
          </button>
        </div>

        {/* Status messages */}
        {submitStatus.type && (
          <div
            className={`p-4 rounded-sm text-center ${
              submitStatus.type === 'success'
                ? 'bg-green-50 text-green-900 border border-green-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            <p className="text-sm md:text-base font-normal">
              {submitStatus.message}
            </p>
          </div>
        )}
      </form>

      {/* Privacy note */}
      <div className="mt-12 pt-8 border-t border-stone-200">
        <h3 className="text-lg font-normal text-stone-900 mb-3">Privacy & Moderation</h3>
        <div className="space-y-2 text-sm text-stone-600">
          <p>
            <strong>Anonymity:</strong> We do not collect email addresses or identifying information.
            Your submission is anonymous.
          </p>
          <p>
            <strong>Public Display:</strong> Messages are displayed publicly as part of the installation—both
            at Truss House during December 19-20 and on this website as an ongoing archive.
          </p>
          <p>
            <strong>Moderation:</strong> We review submissions to prevent abuse. We won't reject grief
            that's raw, angry, or difficult—but we will remove spam, harassment, and content that
            violates the space's intention.
          </p>
        </div>
      </div>
    </div>
  );
}
