'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import {
  availableMoves,
  isFinished,
  type OpportunityDetail,
  type OpportunityMove,
} from '@afaq/types';
import { Button, ConfirmationDialog, type ButtonVariant } from '@afaq/ui';
import { Can } from '@/components/auth/can';
import { useRouter } from '@/i18n/navigation';
import {
  useOpportunityFailure,
  type OpportunityFailure,
} from '@/lib/opportunities/use-opportunity-failure';
import { useDeleteOpportunity } from '@/lib/opportunities/use-opportunity-mutations';
import { EditOpportunityDrawer } from './edit-opportunity-drawer';
import { OpportunityFailureCard } from './opportunity-failure-card';
import { MOVE_STYLE, OpportunityMoveDialog } from './opportunity-move-dialog';

/**
 * Page buttons are less prominent than their confirmation-dialog equivalents.
 * Terminal moves intentionally have quieter variants.
 */
const BUTTON_VARIANT: Record<OpportunityMove, ButtonVariant> = {
  open: 'gradient',
  resume: 'gradient',
  suspend: 'outline',
  close: 'outline',
  cancel: 'ghost',
};

/**
 * Actions allowed for an investment opportunity, subject to viewer permissions.
 * The API rechecks permissions, transitions and business rules for every write.
 */
export function OpportunityActions({
  opportunity,
  currency,
}: {
  opportunity: OpportunityDetail;
  currency: string;
}): ReactNode {
  const t = useTranslations('opportunities.actions');
  const tDelete = useTranslations('opportunities.delete');
  const router = useRouter();

  const remove = useDeleteOpportunity();
  const failureOf = useOpportunityFailure(currency);

  const [editing, setEditing] = useState(false);
  // Keep the selected move stable while its dialog animates closed.
  const [move, setMove] = useState<OpportunityMove>('open');
  const [moving, setMoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<OpportunityFailure | null>(null);

  // Explicit type also protects dynamic Record indexing from implicit-any errors.
  const moves: OpportunityMove[] = availableMoves(opportunity.status);
  const finished = isFinished(opportunity.status);

  function startMove(next: OpportunityMove): void {
    setMove(next);
    setMoving(true);
  }

  async function confirmDelete(): Promise<void> {
    setDeleteFailure(null);

    try {
      await remove.mutateAsync({ id: opportunity.id });
    } catch (error) {
      setDeleteFailure(failureOf(error));
      // Propagate so the confirmation dialog remains open and shows the error.
      throw error;
    }

    router.push('/investments/opportunities');
  }

  // Closed and cancelled opportunities do not show action controls.
  if (finished) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Can permission="opportunity.approve">
          {moves.map((candidate: OpportunityMove) => {
            const { Icon } = MOVE_STYLE[candidate];
            return (
              <Button
                key={candidate}
                variant={BUTTON_VARIANT[candidate]}
                iconStart={<Icon />}
                onClick={() => startMove(candidate)}
              >
                {t(candidate)}
              </Button>
            );
          })}
        </Can>

        <Can permission="opportunity.edit">
          <Button variant="outline" iconStart={<Pencil />} onClick={() => setEditing(true)}>
            {t('edit')}
          </Button>
        </Can>

        {opportunity.status === 'DRAFT' ? (
          <Can permission="opportunity.delete">
            <Button variant="ghost" iconStart={<Trash2 />} onClick={() => setDeleting(true)}>
              {t('deleteDraft')}
            </Button>
          </Can>
        ) : null}
      </div>

      <EditOpportunityDrawer
        // Reset the editor when a newer saved opportunity arrives.
        key={opportunity.updatedAt}
        opportunity={opportunity}
        currency={currency}
        open={editing}
        onClose={() => setEditing(false)}
      />

      <OpportunityMoveDialog
        opportunity={opportunity}
        move={move}
        currency={currency}
        open={moving}
        onClose={() => setMoving(false)}
      />

      <ConfirmationDialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setDeleteFailure(null);
        }}
        onConfirm={confirmDelete}
        tone="danger"
        title={tDelete('title')}
        confirmLabel={tDelete('confirm')}
        cancelLabel={tDelete('keep')}
        message={
          <span className="flex flex-col gap-3">
            <span>{tDelete('message', { title: opportunity.title })}</span>
            <OpportunityFailureCard failure={deleteFailure} />
          </span>
        }
      />
    </>
  );
}
