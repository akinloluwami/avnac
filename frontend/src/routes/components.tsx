import {
  Add01Icon,
  AiMagicIcon,
  Cancel01Icon,
  Delete02Icon,
  Download01Icon,
  Image01Icon,
  Layers02Icon,
  More01Icon,
  QrCodeIcon,
  Search01Icon,
  SentIcon,
  SparklesIcon,
  SquareIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import {
  Badge,
  Button,
  CheckboxOption,
  ColorSwatch,
  Divider,
  Field,
  IconButton,
  Kicker,
  LinkButton,
  MenuItem,
  MenuList,
  PageTitle,
  Panel,
  PopoverSurface,
  RangeField,
  SectionTitle,
  SegmentedControl,
  Select,
  StatusDot,
  Surface,
  Switch,
  Tabs,
  Text,
  TextArea,
  TextInput,
  Toolbar,
} from '../components/ui'

export const Route = createFileRoute('/components')({
  component: ComponentsPage,
})

const colorOptions = ['#0a0a0a', '#ff0e70', '#8B3DFF', '#34d399', '#f59e0b', '#f43f5e']

const componentList = [
  'Button',
  'LinkButton',
  'IconButton',
  'Surface',
  'Panel',
  'Toolbar',
  'PopoverSurface',
  'Divider',
  'Badge',
  'Kicker',
  'PageTitle',
  'SectionTitle',
  'Text',
  'StatusDot',
  'Field',
  'TextInput',
  'TextArea',
  'Select',
  'CheckboxOption',
  'Switch',
  'RangeField',
  'ColorSwatch',
  'MenuList',
  'MenuItem',
  'Tabs',
  'SegmentedControl',
] as const

function ComponentsPage() {
  const [segment, setSegment] = useState('edit')
  const [tab, setTab] = useState('layers')
  const [switchOn, setSwitchOn] = useState(true)
  const [range, setRange] = useState(72)
  const [selectedColor, setSelectedColor] = useState(colorOptions[1])

  return (
    <main className="min-h-[100dvh] bg-[var(--surface-subtle)] px-5 py-8 text-neutral-900 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-6 rounded-[2rem] border border-black/[0.08] bg-white/78 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-md sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Kicker>Avnac Design System</Kicker>
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href="/" size="sm" variant="ghost">
                Home
              </LinkButton>
              <LinkButton href="/editor" size="sm" variant="primary">
                Editor Mock
              </LinkButton>
            </div>
          </div>
          <div className="max-w-3xl">
            <PageTitle>Components</PageTitle>
            <Text className="mt-4 text-lg leading-8">
              A first pass at named UI building blocks for the editor chrome, panels, menus, inputs,
              and controls.
            </Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {componentList.map(name => (
              <Badge key={name}>{name}</Badge>
            ))}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-5">
            <Showcase
              eyebrow="Actions"
              title="Buttons"
              description="Primary commands, secondary commands, quiet controls, destructive actions, and the Magic accent."
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" iconBefore={<HugeiconsIcon icon={Add01Icon} size={17} />}>
                  New canvas
                </Button>
                <Button
                  variant="secondary"
                  iconBefore={<HugeiconsIcon icon={Download01Icon} size={17} />}
                >
                  Export
                </Button>
                <Button variant="subtle">Subtle</Button>
                <Button variant="ghost">Ghost</Button>
                <Button
                  variant="magic"
                  iconBefore={<HugeiconsIcon icon={SparklesIcon} size={17} />}
                >
                  Magic
                </Button>
                <Button
                  variant="danger"
                  iconBefore={<HugeiconsIcon icon={Delete02Icon} size={17} />}
                >
                  Delete
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <IconButton icon={Search01Icon} label="Search" />
                <IconButton icon={Image01Icon} label="Images" active />
                <IconButton icon={More01Icon} label="More" variant="subtle" />
                <IconButton icon={SentIcon} label="Send" variant="primary" />
                <IconButton icon={Cancel01Icon} label="Close" variant="danger" />
              </div>
            </Showcase>

            <Showcase
              eyebrow="Surfaces"
              title="Panels, Toolbars, Menus"
              description="The shapes that should replace most hand-coded rounded borders and shadows."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Panel
                  title="Layers"
                  description="Panel header, content well, and footer action."
                  actions={<IconButton icon={More01Icon} label="Layer options" />}
                >
                  <MenuList>
                    <MenuItem icon={Layers02Icon} label="Hero headline" shortcut="⌘1" active />
                    <MenuItem icon={Image01Icon} label="Background image" shortcut="⌘2" />
                    <MenuItem icon={SquareIcon} label="Accent shape" shortcut="⌘3" />
                  </MenuList>
                  <div className="border-t border-black/[0.06] p-3">
                    <Button fullWidth size="sm" variant="primary">
                      Add layer
                    </Button>
                  </div>
                </Panel>

                <Surface variant="canvas" radius="xl" className="min-h-56 p-4">
                  <Toolbar>
                    <IconButton icon={Add01Icon} label="Add" />
                    <IconButton icon={Image01Icon} label="Image" active />
                    <IconButton icon={AiMagicIcon} label="Magic" variant="magic" />
                    <Divider orientation="vertical" />
                    <Button size="xs" variant="ghost">
                      100%
                    </Button>
                  </Toolbar>
                  <PopoverSurface className="mt-4" width="w-full">
                    <MenuList>
                      <MenuItem
                        icon={ViewIcon}
                        label="Preview selection"
                        description="Shown inline"
                      />
                      <MenuItem
                        icon={QrCodeIcon}
                        label="Create QR code"
                        description="App command"
                      />
                      <MenuItem icon={Delete02Icon} label="Remove object" danger />
                    </MenuList>
                  </PopoverSurface>
                </Surface>
              </div>
            </Showcase>

            <Showcase
              eyebrow="Inputs"
              title="Forms and Controls"
              description="Compact controls for sidebar panels and popovers."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3">
                  <Field label="Document name" htmlFor="component-doc-name">
                    <TextInput id="component-doc-name" defaultValue="Launch poster" />
                  </Field>
                  <Field label="Prompt" htmlFor="component-prompt" hint="Used in the Magic panel.">
                    <TextArea
                      id="component-prompt"
                      defaultValue="Make this feel sharper and more editorial."
                    />
                  </Field>
                  <Field label="Export format" htmlFor="component-format">
                    <Select id="component-format" defaultValue="png">
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="pdf">PDF</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid content-start gap-3">
                  <CheckboxOption
                    label="Transparent background"
                    description="Keep the artboard alpha channel in exports."
                    defaultChecked
                  />
                  <Switch
                    checked={switchOn}
                    onCheckedChange={setSwitchOn}
                    label="Snap to guides"
                    description="Show smart alignment while arranging objects."
                  />
                  <RangeField
                    label="Opacity"
                    min={0}
                    max={100}
                    value={range}
                    unit="%"
                    onChange={setRange}
                  />
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <ColorSwatch
                        key={color}
                        color={color}
                        label={color}
                        selected={selectedColor === color}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Showcase>
          </div>

          <aside className="grid content-start gap-5">
            <Panel
              title="Navigation States"
              description="Tabs and segmented controls for dense panels."
            >
              <Tabs
                items={[
                  { id: 'layers', label: 'Layers', icon: Layers02Icon },
                  { id: 'assets', label: 'Assets', icon: Image01Icon },
                  { id: 'magic', label: 'Magic', icon: AiMagicIcon },
                ]}
                value={tab}
                onValueChange={setTab}
              />
              <div className="grid gap-4 p-4">
                <SegmentedControl
                  items={[
                    { id: 'edit', label: 'Edit' },
                    { id: 'preview', label: 'Preview' },
                    { id: 'export', label: 'Export' },
                  ]}
                  value={segment}
                  onValueChange={setSegment}
                />
                <Surface variant="subtle" padding="sm">
                  <div className="flex items-center gap-2">
                    <StatusDot tone={tab === 'magic' ? 'magic' : 'success'} />
                    <Text className="text-sm">
                      Active panel: <strong>{tab}</strong>
                    </Text>
                  </div>
                </Surface>
              </div>
            </Panel>

            <Panel title="Typography">
              <div className="grid gap-3 p-4">
                <Kicker>Small Label</Kicker>
                <SectionTitle>Section title</SectionTitle>
                <Text tone="default">Default body text for compact surfaces.</Text>
                <Text tone="muted">Muted text for supporting information.</Text>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">Neutral</Badge>
                  <Badge tone="accent">Accent</Badge>
                  <Badge tone="success">Saved</Badge>
                  <Badge tone="warning">Draft</Badge>
                  <Badge tone="danger">Danger</Badge>
                  <Badge tone="magic">Magic</Badge>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  )
}

function Showcase({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Panel eyebrow={eyebrow} title={title} description={description} variant="raised">
      <div className="grid gap-4 p-4">{children}</div>
    </Panel>
  )
}
