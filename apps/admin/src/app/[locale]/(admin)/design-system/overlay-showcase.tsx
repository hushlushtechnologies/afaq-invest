'use client';

import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  ConfirmationDialog,
  Drawer,
  FormField,
  FormLabel,
  InfoCard,
  Input,
  Modal,
  Select,
  Textarea,
  type ConfirmTone,
  type DrawerSide,
  type ModalSize,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const MODAL_SIZES: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full'];

const CONFIRM_COPY: Record<ConfirmTone, { title: string; message: string; label: string }> = {
  danger: {
    title: 'Delete this investor?',
    message: 'This permanently removes the investor record and cannot be undone.',
    label: 'Delete',
  },
  warning: {
    title: 'Approve distribution?',
    message: 'This releases funds to 86 investors. Check the amounts before continuing.',
    label: 'Approve',
  },
  info: {
    title: 'Send notification?',
    message: 'All active investors will receive this notification by email.',
    label: 'Send',
  },
};

export function OverlayShowcase(): ReactNode {
  const [modalSize, setModalSize] = useState<ModalSize | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<DrawerSide | null>(null);
  const [confirmTone, setConfirmTone] = useState<ConfirmTone | null>(null);
  const [nestedConfirm, setNestedConfirm] = useState(false);
  const [lastAction, setLastAction] = useState('none yet');

  async function slowAction(name: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLastAction(`${name} at ${new Date().toLocaleTimeString()}`);
  }

  const copy = CONFIRM_COPY[confirmTone ?? 'danger'];

  return (
    <>
      <ShowcaseSection title="Modal">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {MODAL_SIZES.map((size) => (
              <Button key={size} variant="outline" onClick={() => setModalSize(size)}>
                Size {size}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="gradient" onClick={() => setFormOpen(true)}>
              Modal with a form
            </Button>
            <Button variant="outline" onClick={() => setLongOpen(true)}>
              Long content
            </Button>
          </div>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Drawer">
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setDrawerSide('start')}>
              From the start edge
            </Button>
            <Button variant="outline" onClick={() => setDrawerSide('end')}>
              From the end edge
            </Button>
            <Button variant="outline" onClick={() => setDrawerSide('bottom')}>
              From the bottom
            </Button>
          </div>
          <p className="mt-3 text-caption text-fg-muted">
            In Arabic the start and end drawers swap sides. The end-edge drawer has a Delete button
            that opens a confirmation on top of it.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Confirmation">
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => setConfirmTone('danger')}>
              Delete investor
            </Button>
            <Button variant="outline" onClick={() => setConfirmTone('warning')}>
              Approve distribution
            </Button>
            <Button variant="ghost" onClick={() => setConfirmTone('info')}>
              Send notification
            </Button>
          </div>
          <p className="text-caption text-fg-muted">
            Last confirmed: <span className="text-fg">{lastAction}</span>. Confirming takes 1.2
            seconds, and Escape does nothing while it runs.
          </p>
        </Card>
      </ShowcaseSection>

      <p className="text-caption text-fg-muted">
        Open any overlay and press Tab repeatedly: focus stays inside. Press Escape to close: focus
        returns to the button you pressed.
      </p>

      <Modal
        open={modalSize !== null}
        onClose={() => setModalSize(null)}
        title={`Modal — size ${modalSize ?? ''}`}
        description="The backdrop, Escape and the × button all close this."
        size={modalSize ?? 'md'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalSize(null)}>
              Cancel
            </Button>
            <Button onClick={() => setModalSize(null)}>Done</Button>
          </>
        }
      >
        <p>Focus moved into this dialog when it opened, and Tab cycles only inside it.</p>
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add investment opportunity"
        description="Example fields only — nothing is saved."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={() => setFormOpen(false)}>
              Create
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FormField required>
            <FormLabel>Opportunity name</FormLabel>
            <Input placeholder="Emerald Tower" data-testid="modal-input" />
          </FormField>
          <FormField required>
            <FormLabel>Sector</FormLabel>
            <Select
              placeholder="Select a sector"
              options={[
                { value: 'real-estate', label: 'Real Estate' },
                { value: 'hospitality', label: 'Hospitality' },
              ]}
            />
          </FormField>
          <FormField className="md:col-span-2">
            <FormLabel hint="Optional">Description</FormLabel>
            <Textarea rows={3} placeholder="A short summary" />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={longOpen}
        onClose={() => setLongOpen(false)}
        title="Terms and conditions"
        description="The title and button stay in place while the text scrolls."
        size="lg"
        footer={<Button onClick={() => setLongOpen(false)}>Close</Button>}
      >
        <div className="space-y-4">
          {Array.from({ length: 14 }, (_, index) => (
            <p key={index}>
              Section {index + 1}. Placeholder text showing that long content scrolls inside the
              dialog instead of growing past the edge of the screen.
            </p>
          ))}
        </div>
      </Modal>

      <Drawer
        open={drawerSide !== null}
        onClose={() => setDrawerSide(null)}
        title="Investor details"
        description={`Sliding in from the ${drawerSide ?? ''} edge`}
        side={drawerSide ?? 'end'}
        footer={
          <>
            <Button variant="danger" onClick={() => setNestedConfirm(true)}>
              Delete
            </Button>
            <Button variant="gradient" className="ms-auto" onClick={() => setDrawerSide(null)}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <InfoCard tone="info">Drawers suit detail panels and filters.</InfoCard>
          <FormField>
            <FormLabel>Full name</FormLabel>
            <Input defaultValue="Ahmed Al Mansouri" />
          </FormField>
          <FormField>
            <FormLabel>Email</FormLabel>
            <Input defaultValue="ahmed@afaq.ae" />
          </FormField>
        </div>
      </Drawer>

      <ConfirmationDialog
        open={nestedConfirm}
        onClose={() => setNestedConfirm(false)}
        onConfirm={() => slowAction('Investor deleted from drawer')}
        tone="danger"
        title="Delete this investor?"
        message="Opened on top of the drawer. Escape closes only this dialog."
        confirmLabel="Delete"
      />

      <ConfirmationDialog
        open={confirmTone !== null}
        onClose={() => setConfirmTone(null)}
        onConfirm={() => slowAction(copy.label)}
        tone={confirmTone ?? 'danger'}
        title={copy.title}
        message={copy.message}
        confirmLabel={copy.label}
      />
    </>
  );
}
