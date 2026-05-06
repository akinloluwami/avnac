import {
  Add01Icon,
  AiMagicIcon,
  BackgroundIcon,
  BorderFullIcon,
  Cancel01Icon,
  CircleIcon,
  Copy01Icon,
  CropIcon,
  Cursor01Icon,
  Delete02Icon,
  Download01Icon,
  Home05Icon,
  Image01Icon,
  Layers02Icon,
  More01Icon,
  PenTool03Icon,
  QrCodeIcon,
  SentIcon,
  SparklesIcon,
  SquareIcon,
  StarIcon,
  TextAlignLeftIcon,
  TransparencyIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Badge,
  Button,
  ColorSwatch,
  Divider,
  Field,
  IconButton,
  LinkButton,
  MenuItem,
  MenuList,
  Panel,
  PopoverSurface,
  RangeField,
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
import { cx } from '../components/ui/utils'

export const Route = createFileRoute('/editor')({
  component: EditorMockPage,
})

type ToolId = 'select' | 'text' | 'shape' | 'image' | 'pen' | 'magic'
type PanelId = 'layers' | 'assets' | 'apps' | 'magic'

const railItems: { id: PanelId; label: string; icon: IconSvgElement }[] = [
  { id: 'layers', label: 'Layers', icon: Layers02Icon },
  { id: 'assets', label: 'Assets', icon: Image01Icon },
  { id: 'apps', label: 'Apps', icon: QrCodeIcon },
  { id: 'magic', label: 'Magic', icon: AiMagicIcon },
]

const tools: { id: ToolId; label: string; icon: IconSvgElement }[] = [
  { id: 'select', label: 'Select', icon: Cursor01Icon },
  { id: 'text', label: 'Text', icon: TextAlignLeftIcon },
  { id: 'shape', label: 'Shape', icon: SquareIcon },
  { id: 'image', label: 'Image', icon: Image01Icon },
  { id: 'pen', label: 'Pen', icon: PenTool03Icon },
  { id: 'magic', label: 'Magic', icon: SparklesIcon },
]

const layers = [
  { id: 'headline', label: 'Festival headline', icon: TextAlignLeftIcon, active: true },
  { id: 'photo', label: 'Performer photo', icon: Image01Icon, active: false },
  { id: 'badge', label: 'Early access badge', icon: StarIcon, active: false },
  { id: 'shape', label: 'Orange ellipse', icon: CircleIcon, active: false },
]

const colors = ['#0a0a0a', '#ff0e70', '#8B3DFF', '#34d399', '#f43f5e']

function EditorMockPage() {
  const [panel, setPanel] = useState<PanelId>('layers')
  const [tool, setTool] = useState<ToolId>('select')
  const [inspectorTab, setInspectorTab] = useState('style')
  const [assetMode, setAssetMode] = useState('library')
  const [opacity, setOpacity] = useState(86)
  const [blur, setBlur] = useState(8)
  const [snap, setSnap] = useState(true)
  const [selectedColor, setSelectedColor] = useState(colors[1])

  const activePanelTitle =
    panel === 'layers'
      ? 'Layers'
      : panel === 'assets'
        ? 'Assets'
        : panel === 'apps'
          ? 'Apps'
          : 'Magic'

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#efefed] text-neutral-900">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.08] bg-white/92 px-3 backdrop-blur-xl sm:px-4">
        <LinkButton
          href="/"
          size="sm"
          variant="ghost"
          iconBefore={<HugeiconsIcon icon={Home05Icon} size={16} />}
        >
          Avnac
        </LinkButton>
        <Divider orientation="vertical" />
        <Field className="hidden min-w-0 max-w-xs flex-1 sm:grid">
          <TextInput className="h-9" value="Spring Festival Poster" readOnly />
        </Field>
        <Badge tone="success" className="hidden sm:inline-flex">
          Saved
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <LinkButton href="/components" size="sm" variant="secondary">
            Components
          </LinkButton>
          <Button
            variant="primary"
            size="sm"
            iconBefore={<HugeiconsIcon icon={Download01Icon} size={16} />}
          >
            Export
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[4.75rem] shrink-0 items-start justify-center border-r border-black/[0.06] bg-white/48 px-3 py-4 md:flex">
          <Surface variant="chrome" radius="xl" padding="xs" className="grid gap-1">
            {railItems.map(item => (
              <IconButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={panel === item.id}
                variant={item.id === 'magic' ? 'magic' : 'chrome'}
                size="lg"
                onClick={() => setPanel(item.id)}
              />
            ))}
          </Surface>
        </aside>

        <aside className="hidden w-80 shrink-0 border-r border-black/[0.06] bg-white/38 p-3 lg:block">
          <Panel
            title={activePanelTitle}
            description="Reusable panel shell"
            actions={<IconButton icon={Cancel01Icon} label="Close panel" />}
            className="h-full"
          >
            {panel === 'layers' ? <LayersPanel /> : null}
            {panel === 'assets' ? (
              <AssetsPanel assetMode={assetMode} onAssetModeChange={setAssetMode} />
            ) : null}
            {panel === 'apps' ? <AppsPanel /> : null}
            {panel === 'magic' ? <MagicPanel /> : null}
          </Panel>
        </aside>

        <section className="relative min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
            <Toolbar>
              {tools.map(item => (
                <IconButton
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={tool === item.id}
                  variant={item.id === 'magic' ? 'magic' : 'chrome'}
                  onClick={() => setTool(item.id)}
                />
              ))}
              <Divider orientation="vertical" />
              <Button size="xs" variant="ghost">
                100%
              </Button>
            </Toolbar>
          </div>

          <div className="flex h-full items-center justify-center overflow-auto px-8 py-24">
            <Surface
              variant="raised"
              radius="sm"
              padding="none"
              className="relative h-[620px] w-[440px] overflow-hidden bg-[#fff8ef]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.035)_1px,transparent_1px),linear-gradient(rgba(10,10,10,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
              <div className="absolute left-10 top-10 rounded-full bg-[#ff0e70] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-neutral-950">
                Live set
              </div>
              <div className="absolute left-10 top-28 max-w-[20rem]">
                <div className="display-title text-[4.5rem] font-semibold leading-[0.9] tracking-[-0.04em] text-neutral-950">
                  Spring Sounds
                </div>
                <Text className="mt-5 text-base leading-7 text-neutral-700">
                  Three stages, warm nights, independent artists, and a poster that finally has room
                  to breathe.
                </Text>
              </div>
              <div className="absolute bottom-24 left-10 h-44 w-44 rounded-full bg-[#8B3DFF]/16" />
              <div className="absolute bottom-14 right-8 h-64 w-44 rotate-3 rounded-[2rem] border border-black/[0.08] bg-[linear-gradient(160deg,#242424,#57534e)] shadow-[0_22px_45px_rgba(15,23,42,0.2)]" />
              <div className="absolute bottom-12 left-10 right-10 flex items-center justify-between border-t border-black/[0.14] pt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-neutral-700">
                <span>May 28</span>
                <span>Lagos</span>
                <span>7 PM</span>
              </div>

              <div className="absolute left-8 top-24 h-60 w-[22rem] rounded-md border-2 border-[var(--accent)]">
                <span className="absolute -left-1.5 -top-1.5 size-3 rounded-sm border border-[#a86944] bg-white" />
                <span className="absolute -right-1.5 -top-1.5 size-3 rounded-sm border border-[#a86944] bg-white" />
                <span className="absolute -bottom-1.5 -left-1.5 size-3 rounded-sm border border-[#a86944] bg-white" />
                <span className="absolute -bottom-1.5 -right-1.5 size-3 rounded-sm border border-[#a86944] bg-white" />
              </div>

              <div className="absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2">
                <Toolbar compact>
                  <IconButton icon={CropIcon} label="Crop" />
                  <IconButton icon={Copy01Icon} label="Duplicate" />
                  <IconButton icon={TransparencyIcon} label="Opacity" active />
                  <Divider orientation="vertical" />
                  <IconButton icon={Delete02Icon} label="Delete" variant="danger" />
                </Toolbar>
              </div>
            </Surface>
          </div>

          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
            <Toolbar>
              <Button size="xs" variant="ghost">
                Fit
              </Button>
              <RangeField min={25} max={200} value={100} className="w-44" />
              <Button size="xs" variant="ghost">
                Grid
              </Button>
            </Toolbar>
          </div>
        </section>

        <aside className="hidden w-80 shrink-0 border-l border-black/[0.06] bg-white/52 p-3 xl:block">
          <Panel
            title="Inspector"
            description="Component-built controls"
            actions={<IconButton icon={More01Icon} label="More inspector actions" />}
            className="h-full"
          >
            <Tabs
              items={[
                { id: 'style', label: 'Style', icon: BackgroundIcon },
                { id: 'layout', label: 'Layout', icon: SquareIcon },
                { id: 'export', label: 'Export', icon: Download01Icon },
              ]}
              value={inspectorTab}
              onValueChange={setInspectorTab}
            />
            <div className="grid gap-4 p-4">
              <Field label="Selection name" htmlFor="mock-selection-name">
                <TextInput id="mock-selection-name" defaultValue="Festival headline" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="X" htmlFor="mock-x">
                  <TextInput id="mock-x" defaultValue="40" />
                </Field>
                <Field label="Y" htmlFor="mock-y">
                  <TextInput id="mock-y" defaultValue="96" />
                </Field>
              </div>
              <RangeField
                label="Opacity"
                min={0}
                max={100}
                value={opacity}
                unit="%"
                onChange={setOpacity}
              />
              <RangeField label="Blur" min={0} max={32} value={blur} unit="px" onChange={setBlur} />
              <div className="grid gap-2">
                <div className="text-[12px] font-semibold text-neutral-700">Fill</div>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
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
              <Field label="Stroke" htmlFor="mock-stroke">
                <Select id="mock-stroke" defaultValue="solid">
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="none">None</option>
                </Select>
              </Field>
              <Switch
                checked={snap}
                onCheckedChange={setSnap}
                label="Snap to guides"
                description="Interactive only in the mock."
              />
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  )
}

function LayersPanel() {
  return (
    <div className="grid gap-3 p-3">
      <Field>
        <TextInput placeholder="Search layers" />
      </Field>
      <MenuList className="p-0">
        {layers.map(layer => (
          <MenuItem
            key={layer.id}
            icon={layer.icon}
            label={layer.label}
            shortcut={layer.active ? <StatusDot tone="success" /> : null}
            active={layer.active}
          />
        ))}
      </MenuList>
      <Button
        fullWidth
        size="sm"
        variant="primary"
        iconBefore={<HugeiconsIcon icon={Add01Icon} size={16} />}
      >
        Add object
      </Button>
    </div>
  )
}

function AssetsPanel({
  assetMode,
  onAssetModeChange,
}: {
  assetMode: string
  onAssetModeChange: (value: string) => void
}) {
  return (
    <div className="grid gap-3 p-3">
      <SegmentedControl
        value={assetMode}
        onValueChange={onAssetModeChange}
        items={[
          { id: 'library', label: 'Library' },
          { id: 'uploads', label: 'Uploads' },
        ]}
      />
      <Field>
        <TextInput placeholder="Search images" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        {['#fde68a', '#fecaca', '#bfdbfe', '#d9f99d'].map((color, index) => (
          <button
            key={color}
            type="button"
            className="aspect-square rounded-2xl border border-black/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
            style={{ background: `linear-gradient(135deg, ${color}, #ffffff)` }}
            aria-label={`Asset ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

function AppsPanel() {
  return (
    <div className="grid gap-3 p-3">
      <MenuList className="p-0">
        <MenuItem
          icon={QrCodeIcon}
          label="QR code"
          description="Generate a scannable object"
          active
        />
        <MenuItem icon={BorderFullIcon} label="Frames" description="Reusable borders and masks" />
        <MenuItem icon={ViewIcon} label="Preview" description="Open a lightweight preview" />
      </MenuList>
      <PopoverSurface width="w-full">
        <div className="grid gap-3 p-3">
          <Text className="text-sm">QR preview</Text>
          <div className="grid aspect-square place-items-center rounded-xl border border-black/[0.08] bg-white">
            <HugeiconsIcon icon={QrCodeIcon} size={76} strokeWidth={1.2} />
          </div>
        </div>
      </PopoverSurface>
    </div>
  )
}

function MagicPanel() {
  return (
    <div className="grid gap-3 p-3">
      <Surface variant="subtle" padding="sm" className="border-[#8B3DFF]/16 bg-[#8B3DFF]/6">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={AiMagicIcon} size={18} className="text-[#6838ce]" />
          <Text className="text-sm font-medium text-[#5630a8]">Magic is ready for a prompt.</Text>
        </div>
      </Surface>
      <Field label="Prompt" htmlFor="mock-magic-prompt">
        <TextArea
          id="mock-magic-prompt"
          defaultValue="Make the headline bolder and add a warmer color accent."
        />
      </Field>
      <Button variant="magic" fullWidth iconBefore={<HugeiconsIcon icon={SentIcon} size={16} />}>
        Generate
      </Button>
      <div className="grid gap-2">
        {['Add a torn paper texture', 'Try a stricter grid', 'Make it more playful'].map(prompt => (
          <button
            key={prompt}
            type="button"
            className={cx(
              'rounded-xl border border-black/[0.07] bg-white px-3 py-2 text-left text-[13px] text-neutral-700 transition-colors hover:bg-black/[0.03]',
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
