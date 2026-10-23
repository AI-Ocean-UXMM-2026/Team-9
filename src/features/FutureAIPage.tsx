import { useState, type FormEvent } from 'react';
import { SendHorizontal, Sparkles } from 'lucide-react';
import { answerRecordedQuestion } from '../domain/analysis';
import { useDemoStore } from '../store/demoStore';
import { clockForTimeZone } from '../services/clock';
import { useTranslation } from 'react-i18next';

export function FutureAIPage() {
  const { t } = useTranslation();
  const data = useDemoStore((state) => state.data);
  const timeZone = useDemoStore((state) => state.timeZone);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<ReturnType<
    typeof answerRecordedQuestion
  > | null>(null);
  const [version, setVersion] = useState(0);
  function submit(event: FormEvent) {
    event.preventDefault();
    setAnswer(
      answerRecordedQuestion(
        data,
        clockForTimeZone(timeZone).today(),
        question,
      ),
    );
    setVersion((value) => value + 1);
  }
  return (
    <div className="chat-page">
      <header className="page-heading">
        <h1 tabIndex={-1}>Ask AI</h1>
      </header>
      <p className="future-feature-notice">
        Demo interface. Answers use local record rules. No AI provider is
        connected.
      </p>
      {!answer ? (
        <section className="future-chat-welcome">
          <span>
            <Sparkles size={27} aria-hidden="true" />
          </span>
          <h2>A little clarity, when you need it.</h2>
          <p>Preview questions about the records you have saved.</p>
          <div>
            {[
              'What do I owe?',
              'What is owed to me?',
              'How much did I spend this month?',
            ].map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => setQuestion(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section
          key={version}
          className="chat-answer surface-card p-6"
          aria-live="polite"
        >
          <h2 className="font-semibold">Demo answer</h2>
          <p className="mt-3">
            {t(
              answer.messageKey,
              Object.fromEntries(
                Object.entries(answer.values).map(([key, value]) => [
                  key,
                  typeof value === 'number' &&
                  !['count', 'percent', 'completed', 'total'].includes(key)
                    ? new Intl.NumberFormat('en-US').format(value)
                    : key === 'category' && typeof value === 'string'
                      ? t(`category.${value}`)
                      : value,
                ]),
              ),
            )}
          </p>
        </section>
      )}
      <form className="chat-composer" onSubmit={submit}>
        <label htmlFor="chat-question" className="sr-only">
          Preview a question about your records
        </label>
        <div className="chat-input-wrap">
          <input
            id="chat-question"
            className="chat-input"
            maxLength={300}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="For example: What do I owe?"
            required
          />
        </div>
        <button className="chat-send" aria-label="Ask demo">
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
