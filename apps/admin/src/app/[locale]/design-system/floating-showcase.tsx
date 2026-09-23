'use client';

import {
  Download,
  Filter,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Settings,
  Share2,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  FormField,
  FormLabel,
  IconButton,
  Modal,
  Popover,
  Select,
  Tooltip,
  type OverlayPlacement,
} from '@afaq/ui';
import { ShowcaseSection } from './showcase-section';

const PLACEMENTS: OverlayPlacement[] = ['top', 'bottom', 'left', 'right'];

export function FloatingShowcase(): ReactNode {
  const [lastAction, setLastAction] = useState('none yet');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ShowcaseSection title="Dropdown">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Dropdown label="Row actions" trigger={<Button variant="outline">Actions</Button>}>
              <DropdownLabel>Manage</DropdownLabel>
              <DropdownItem icon={<Pencil />} onSelect={() => setLastAction('Edit')}>
                Edit investor
              </DropdownItem>
              <DropdownItem
                icon={<Download />}
                shortcut="Ctrl E"
                onSelect={() => setLastAction('Export')}
              >
                Export data
              </DropdownItem>
              <DropdownItem icon={<Share2 />} disabled>
                Share (disabled)
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<Trash2 />}
                tone="danger"
                onSelect={() => setLastAction('Delete')}
              >
                Delete
              </DropdownItem>
            </Dropdown>

            <Dropdown
              label="More options"
              placement="bottom-end"
              trigger={
                <IconButton icon={<MoreHorizontal />} label="More options" variant="outline" />
              }
            >
              <DropdownItem icon={<UserCog />} onSelect={() => setLastAction('Permissions')}>
                Permissions
              </DropdownItem>
              <DropdownItem icon={<Settings />} onSelect={() => setLastAction('Settings')}>
                Settings
              </DropdownItem>
            </Dropdown>

            <Dropdown
              label="Account"
              placement="bottom-end"
              trigger={
                <button
                  type="button"
                  aria-label="Account menu"
                  data-testid="avatar-trigger"
                  className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Avatar name="Ahmed Al Mansouri" size="sm" />
                </button>
              }
            >
              <DropdownLabel>ahmed@afaq.ae</DropdownLabel>
              <DropdownItem onSelect={() => setLastAction('My profile')}>My profile</DropdownItem>
              <DropdownItem onSelect={() => setLastAction('Security')}>Security</DropdownItem>
              <DropdownSeparator />
              <DropdownItem tone="danger" onSelect={() => setLastAction('Sign out')}>
                Sign out
              </DropdownItem>
            </Dropdown>

            <Button variant="ghost" onClick={() => setModalOpen(true)}>
              Menu inside a dialog
            </Button>
          </div>
          <p className="text-caption text-fg-muted">
            Last chosen: <span className="text-fg">{lastAction}</span>. Open a menu with Enter and
            use the arrow keys, Home, End and Escape.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Popover">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Popover
              title="Filter investors"
              showCloseButton
              trigger={
                <Button variant="outline" iconStart={<Filter />}>
                  Filters
                </Button>
              }
            >
              <div className="space-y-4">
                <FormField>
                  <FormLabel>Status</FormLabel>
                  <Select
                    fieldSize="sm"
                    placeholder="Any status"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'pending', label: 'Pending' },
                    ]}
                  />
                </FormField>
                <div className="space-y-2">
                  <Checkbox label="KYC verified only" />
                  <Checkbox label="Internal companies only" />
                </div>
                <Divider />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" fullWidth>
                    Reset
                  </Button>
                  <Button size="sm" fullWidth>
                    Apply
                  </Button>
                </div>
              </div>
            </Popover>

            <Popover
              width="sm"
              placement="right"
              trigger={<IconButton icon={<HelpCircle />} label="What is target return?" />}
            >
              <p>
                Target return is the projected yearly return before fees. Actual returns depend on
                performance and are not guaranteed.
              </p>
            </Popover>
          </div>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Tooltip">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {PLACEMENTS.map((placement) => (
              <Tooltip key={placement} content={`Placed ${placement}`} placement={placement}>
                <Button variant="outline" size="sm">
                  {placement}
                </Button>
              </Tooltip>
            ))}
          </div>
          <Divider label="on icon buttons" />
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip content="Delete this investor permanently">
              <IconButton icon={<Trash2 />} label="Delete" variant="danger" />
            </Tooltip>
            <Tooltip content="Export the current view as a spreadsheet" delay={0}>
              <IconButton icon={<Download />} label="Export" variant="outline" />
            </Tooltip>
            <Tooltip content="Longer text wraps onto several lines and stays readable at this width.">
              <IconButton icon={<HelpCircle />} label="Help" />
            </Tooltip>
          </div>
          <p className="text-caption text-fg-muted">
            Hovering waits 400ms. Tabbing to a button shows it at once. Escape hides it.
          </p>
        </Card>
      </ShowcaseSection>

      <ShowcaseSection title="Staying on screen">
        <Card>
          <p className="mb-4 text-body-small text-fg-subtle">
            Scroll until this card is near the bottom of the window, then open the menu. It opens
            upwards instead of running off the screen.
          </p>
          <Dropdown
            label="Edge test"
            trigger={<Button variant="gradient">Open near an edge</Button>}
          >
            {Array.from({ length: 8 }, (_, index) => (
              <DropdownItem key={index}>Menu item {index + 1}</DropdownItem>
            ))}
          </Dropdown>
        </Card>
      </ShowcaseSection>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Menu inside a dialog"
        description="The menu must appear above the dialog, and Escape must close only the menu."
      >
        <Dropdown label="Dialog actions" trigger={<Button variant="outline">Open menu</Button>}>
          <DropdownItem onSelect={() => setLastAction('From dialog')}>From the dialog</DropdownItem>
          <DropdownItem>Another action</DropdownItem>
        </Dropdown>
      </Modal>
    </>
  );
}
