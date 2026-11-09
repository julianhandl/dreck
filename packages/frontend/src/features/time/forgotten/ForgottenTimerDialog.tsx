import { Form } from '@base-ui/react/form';
import type { ReactElement } from 'react';
import { formatDate } from '@/format/date';
import { FormStatus } from '@/forms/FormStatus';
import { TextField } from '@/forms/TextField';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import type { ForgottenTimer } from './useForgottenTimer';

type ForgottenTimerDialogProps = {
  /** State from `useForgottenTimer`; the dialog is open while `question` is set. */
  forgotten: ForgottenTimer;
  /** Name of the Project of the forgotten timer. */
  projectName: string;
};

/**
 * Question "Wann hast du aufgehört?" before a start or stop while the running timer was
 * forgotten: a time on its start day, or "Nein, bis jetzt gearbeitet".
 * @example <ForgottenTimerDialog forgotten={page.forgotten} projectName="Website" />
 */
export function ForgottenTimerDialog({
  forgotten,
  projectName,
}: ForgottenTimerDialogProps): ReactElement {
  const { language, messages } = useI18n();
  const { submit } = forgotten;
  const t = messages.forgotten;
  const day = formatDate(forgotten.startDate, language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Modal
      title={t.title}
      open={forgotten.question !== null}
      onOpenChange={(open) => !open && forgotten.handleCancel()}
    >
      <Form
        ref={submit.formRef}
        errors={submit.errors}
        onFormSubmit={() => submit.handleSubmit('stoppedAt')}
        className="flex flex-col gap-4"
      >
        <p>{t.since(projectName, day, forgotten.startTime)}</p>
        <TextField
          name="stoppedAt"
          label={t.stoppedAt(day)}
          type="time"
          value={forgotten.stoppedAt}
          onValueChange={forgotten.handleStoppedAtChange}
          inputClassName="max-w-40"
        />
        <FormStatus submit={submit} />
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" type="submit" aria-disabled={submit.pending}>
            {t.stop}
          </Button>
          <Button aria-disabled={submit.pending} onClick={() => submit.handleSubmit('untilNow')}>
            {t.untilNow}
          </Button>
          <Button variant="link" onClick={forgotten.handleCancel}>
            {messages.common.cancel}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
