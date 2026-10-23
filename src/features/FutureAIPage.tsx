import { useUiText } from '../i18n/useUiText';
import { useState, type FormEvent } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { answerRecordedQuestion } from '../domain/analysis';
import { useDemoStore } from '../store/demoStore';
import { clockForTimeZone } from '../services/clock';
import { useTranslation } from 'react-i18next';
const prompts = [
  'What do I owe?',
  'What is owed to me?',
  'How much did I spend this month?',
];

export function FutureAIPage() {
  const text = useUiText();
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
        prompts.find((prompt) => text(prompt) === question) ?? question,
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
        {text(
          'Demo interface. Answers use local record rules. No AI provider is connected.',
        )}
      </p>
      {!answer ? (
        <section className="future-chat-welcome">
          <span>
            <Sparkles size={27} aria-hidden="true" />
          </span>
          <h2>{text('A little clarity, when you need it.')}</h2>
          <p>{text('Preview questions about the records you have saved.')}</p>
          <div>
            {prompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => setQuestion(text(prompt))}
              >
                {text(prompt)}
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
          <h2 className="font-semibold">{text('Demo answer')}</h2>
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
          {text('Preview a question about your records')}
        </label>
        <div className="chat-input-wrap">
          <input
            id="chat-question"
            className="chat-input"
            maxLength={300}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={text('For example: What do I owe?')}
            required
          />
        </div>
        <button className="chat-send" aria-label={text('Ask demo')}>
          <ArrowUp size={22} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
