import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Copy01Icon,
  Delete02Icon,
  FilePasteIcon,
  HelpCircleIcon,
  Image01Icon,
  CropIcon,
  Layers02Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  TextFontIcon,
} from '@hugeicons/core-free-icons'
import type { Canvas, FabricImage, FabricObject, IText } from 'fabric'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import {
  AVNAC_DOC_VERSION,
  AVNAC_STORAGE_KEY,
  parseAvnacDocument,
  type AvnacDocumentV1,
} from '../lib/avnac-document'
import { idbGetDocument, idbPutDocument } from '../lib/avnac-editor-idb'
import {
  loadVectorBoardDocs,
  loadVectorBoards,
  mergeVectorBoardDocsForMeta,
  saveVectorBoardDocs,
  saveVectorBoards,
  type AvnacVectorBoardMeta,
} from '../lib/avnac-vector-boards-storage'
import {
  emptyVectorBoardDocument,
  AVNAC_VECTOR_BOARD_DRAG_MIME,
  vectorDocHasRenderableStrokes,
  type VectorBoardDocument,
} from '../lib/avnac-vector-board-document'
import {
  createVectorBoardFabricGroup,
  detachAvnacVectorBoardLink,
  refreshAllVectorBoardInstances,
  syncVectorBoardInstancesToDoc,
} from '../lib/avnac-vector-board-fabric'
import { installSceneSnap } from '../lib/fabric-scene-snap'
import { removeActiveObjectFromCanvas } from '../lib/fabric-remove-selection'
import {
  ensureAvnacArrowEndpoints,
  installArrowEndpointControls,
  refreshAvnacLineArrowHandleSizes,
  syncAvnacArrowCurveControlVisibility,
  syncAvnacArrowEndpointsFromGeometry,
} from '../lib/fabric-line-arrow-controls'
import {
  applySceneHandleSizesToCanvas,
  applySceneHandleSizesToInteractiveObject,
  attachFabricHoverOutline,
  EDITOR_CANVAS_ACCENT,
  getSceneHandleSizesForArtboard,
  installFabricSelectionChrome,
  type SceneHandleSizes,
} from '../lib/fabric-selection-chrome'
import { regularPolygonPoints, starPolygonPoints } from '../lib/avnac-shape-geometry'
import {
  arrowDisplayColor,
  createArrowGroup,
  getArrowParts,
  layoutArrowGroup,
} from '../lib/avnac-stroke-arrow'
import {
  avnacStrokeLineHeadFrac,
  getAvnacShapeMeta,
  isAvnacStrokeLineLike,
  setAvnacShapeMeta,
  type ArrowLineStyle,
  type ArrowPathType,
  type AvnacShapeKind,
  type AvnacShapeMeta,
} from '../lib/avnac-shape-meta'
import {
  applyBgValueToFill,
  applyBgValueToStroke,
  bgValueFromFabricFill,
  bgValueFromFabricStroke,
  bgValuesShallowEqual,
  bgValueSolidFallback,
  getAvnacStroke,
  setAvnacStroke,
} from '../lib/avnac-fill-paint'
import {
  averageFabricShadowUi,
  buildFabricShadow,
  DEFAULT_FABRIC_SHADOW_UI,
  readFabricShadowUi,
  type FabricShadowUi,
} from '../lib/avnac-fabric-shadow'
import { collectOutlineStrokeTargets } from '../lib/avnac-selection-outline-stroke'
import {
  disableTextboxAutoWidth,
  enableTextboxAutoWidth,
  fitTextboxWidthToContent,
  textboxUsesAutoWidth,
} from '../lib/avnac-textbox-autowidth'
import { alignSelectedObjectsRelative } from '../lib/fabric-align-selection-elements'
import {
  computeTransformDimensionUi,
  TRANSFORM_DIMENSION_END_ACTIONS,
  type TransformDimensionUi,
} from '../lib/fabric-transform-dimension-ui'
import {
  applyFabricImageSourceCrop,
  getFabricImageSourceCrop,
} from '../lib/avnac-fabric-image-crop'
import {
  sceneCornerRadiusFromImage,
  sceneCornerRadiusFromRect,
  sceneCornerRadiusMaxForObject,
  setSceneCornerRadiusOnImage,
  setSceneCornerRadiusOnRect,
} from '../lib/fabric-corner-radius'
import {
  installAvnacObjectCanvasBlur,
  migrateLegacyImageBlurFilters,
  readBlurPctFromFabricObject,
} from '../lib/avnac-object-blur'
import {
  ensureAvnacLayerId,
  getAvnacLayerName,
  renewAvnacLayerId,
  setAvnacLayerName,
} from '../lib/ensure-avnac-layer-id'
import { extractImageUrlFromDataTransfer } from '../lib/extract-image-url-from-data-transfer'
import { linearGradientForBox } from '../lib/fabric-linear-gradient'
import { loadCanvasGoogleFontsAndRelayout } from '../lib/avnac-canvas-google-fonts'
import { loadGoogleFontFamily } from '../lib/load-google-font'
import {
  loadExportSafeFabricImage,
  normalizeCanvasImagesForExport,
} from '../lib/avnac-image-proxy'
import ShapeOptionsToolbar from './shape-options-toolbar'
import TransparencyToolbarPopover from './transparency-toolbar-popover'
import ShapesPopover, {
  iconForShapesQuickAdd,
  type PopoverShapeKind,
  type ShapesQuickAddKind,
} from './shapes-popover'
import TextFormatToolbar from './text-format-toolbar'
import type { TextFormatToolbarValues } from './text-format-toolbar'
import BackgroundPopover, {
  bgValueToSwatch,
  type BgValue,
} from './background-popover'
import ArtboardResizeToolbarControl from './artboard-resize-toolbar-control'
import BlurToolbarControl from './blur-toolbar-control'
import ShadowToolbarPopover from './shadow-toolbar-popover'
import StrokeToolbarPopover from './stroke-toolbar-popover'
import CornerRadiusToolbarControl from './corner-radius-toolbar-control'
import CanvasZoomSlider from './canvas-zoom-slider'
import CanvasElementToolbar, {
  type CanvasAlignKind,
} from './canvas-element-toolbar'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from './floating-toolbar-shell'
import ImageCropModal, {
  type ImageCropModalApplyPayload,
} from './image-crop-modal'
import { getAvnacLocked, setAvnacLocked } from '../lib/avnac-object-lock'
import type { ExportPngOptions } from './editor-export-menu'
import EditorFloatingSidebar, {
  type EditorSidebarPanelId,
} from './editor-floating-sidebar'
import EditorLayersPanel, {
  type EditorLayerRow,
} from './editor-layers-panel'
import EditorAiPanel from './editor-ai-panel'
import type {
  AiDesignController,
  AiObjectKind,
  AiObjectSummary,
} from '../lib/avnac-ai-controller'
import EditorShortcutsModal from './editor-shortcuts-modal'
import EditorUploadsPanel from './editor-uploads-panel'
import EditorAppsPanel from './editor-apps-panel'
import EditorImagesPanel from './editor-images-panel'
import EditorVectorBoardPanel from './editor-vector-board-panel'
import VectorBoardWorkspace from './vector-board-workspace'

const DEFAULT_ARTBOARD_W = 4000
const DEFAULT_ARTBOARD_H = 4000
const ARTBOARD_ALIGN_PAD = 32
const ARTBOARD_ALIGN_ALREADY_EPS = 2
const ZOOM_MIN_PCT = 5
const ZOOM_MAX_PCT = 100

const OBJECT_SERIAL_KEYS = [
  'avnacShape',
  'avnacLocked',
  'avnacBlur',
  'avnacFill',
  'avnacStroke',
  'avnacLayerId',
  'avnacLayerName',
  'avnacVectorBoardId',
] as const

const DEFAULT_PAINT: BgValue = { type: 'solid', color: '#262626' }

const FIT_PADDING = 32

function artboardAlignAlreadySatisfied(
  br: {
    left: number
    top: number
    width: number
    height: number
  },
  boardW: number,
  boardH: number,
): Record<CanvasAlignKind, boolean> {
  const pad = ARTBOARD_ALIGN_PAD
  const eps = ARTBOARD_ALIGN_ALREADY_EPS
  return {
    left: Math.abs(br.left - pad) <= eps,
    centerH: Math.abs(br.left + br.width / 2 - boardW / 2) <= eps,
    right: Math.abs(br.left + br.width - (boardW - pad)) <= eps,
    top: Math.abs(br.top - pad) <= eps,
    centerV: Math.abs(br.top + br.height / 2 - boardH / 2) <= eps,
    bottom: Math.abs(br.top + br.height - (boardH - pad)) <= eps,
  }
}

const QUICK_SHAPE_TITLE: Record<ShapesQuickAddKind, string> = {
  generic: 'Add square',
  rect: 'Add square',
  ellipse: 'Add ellipse',
  polygon: 'Add polygon',
  star: 'Add star',
  line: 'Add line',
  arrow: 'Add arrow',
}

function toolbarIconBtn(disabled?: boolean) {
  const base =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--hover)]'
  if (disabled) {
    return `${base} pointer-events-none cursor-not-allowed opacity-35`
  }
  return base
}

function backgroundTopBtn(disabled?: boolean) {
  const base =
    'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--text)] outline-none transition-colors hover:bg-[var(--hover)]'
  if (disabled) {
    return `${base} pointer-events-none cursor-not-allowed opacity-35`
  }
  return base
}

function isEventOnFabricCanvas(canvas: Canvas, target: EventTarget | null) {
  if (!(target instanceof Node)) return false
  const lower = canvas.getElement()
  const upper = canvas.upperCanvasEl
  return lower.contains(target) || upper.contains(target)
}

function pointerIsTouch(e: Event): boolean {
  return 'pointerType' in e && (e as PointerEvent).pointerType === 'touch'
}

/** Local outer radius for centered polygon/star points after scaling is baked into geometry. */
function outerRadiusFromScaledPolygon(obj: FabricObject) {
  return Math.max(
    24,
    Math.min(obj.getScaledWidth(), obj.getScaledHeight()) / 2,
  )
}

function primaryFontFamily(css: string) {
  const first = css.split(',')[0]?.trim() ?? 'Inter'
  return first.replace(/^["']|["']$/g, '')
}

function readTextFormat(obj: IText, fontSize: number): TextFormatToolbarValues {
  const fillStyle = bgValueFromFabricFill(obj)
  const ta = obj.textAlign ?? 'left'
  const textAlign =
    ta === 'center' || ta === 'right' || ta === 'justify' ? ta : 'left'
  const w = obj.fontWeight
  const bold =
    w === 'bold' ||
    w === '700' ||
    w === 700 ||
    (typeof w === 'number' && w >= 600)
  return {
    fontFamily: primaryFontFamily(String(obj.fontFamily ?? 'Inter')),
    fontSize: obj.fontSize ?? fontSize,
    fillStyle,
    textAlign,
    bold,
    italic: obj.fontStyle === 'italic',
    underline: !!obj.underline,
  }
}

function avnacShapeKindLayerLabel(kind: AvnacShapeKind): string {
  const labels: Record<AvnacShapeKind, string> = {
    rect: 'Square',
    ellipse: 'Ellipse',
    polygon: 'Polygon',
    star: 'Star',
    line: 'Line',
    arrow: 'Arrow',
  }
  return labels[kind]
}

function fabricObjectLabel(
  o: FabricObject,
  mod: typeof import('fabric'),
): string {
  const custom = getAvnacLayerName(o)
  if (custom) return custom
  if (mod.FabricImage && o instanceof mod.FabricImage) return 'Image'
  if (mod.IText && o instanceof mod.IText) {
    return o.text?.trim() || 'Text'
  }
  const m = getAvnacShapeMeta(o)
  if (m) return avnacShapeKindLayerLabel(m.kind)
  return o.type ?? 'Object'
}

export type FabricEditorHandle = {
  exportPng: (opts?: ExportPngOptions) => void
  saveDocument: () => void
  loadDocument: (file: File) => Promise<void>
}

type FabricEditorProps = {
  onReadyChange?: (ready: boolean) => void
  /** When set, document is restored from and autosaved to IndexedDB under this id. */
  persistId?: string
  /** Stored with each IndexedDB save (file name in the editor header). */
  persistDisplayName?: string
  /** When there is no saved document yet, seed artboard size (e.g. from /create?w=&h=). */
  initialArtboardWidth?: number
  initialArtboardHeight?: number
}

type EditorContextMenuState = {
  x: number
  y: number
  sceneX: number
  sceneY: number
  hasSelection: boolean
  locked: boolean
}

async function readClipboardImageFiles(): Promise<File[]> {
  const read = navigator.clipboard?.read
  if (!read) return []
  const items = await read.call(navigator.clipboard)
  const files: File[] = []
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'))
    if (!imageType) continue
    const blob = await item.getType(imageType)
    const ext = imageType.split('/')[1]?.split('+')[0] || 'png'
    files.push(
      new File([blob], `clipboard-image.${ext}`, {
        type: imageType,
      }),
    )
  }
  return files
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name)
}

function imageFilesFromClipboardData(dt: DataTransfer | null): File[] {
  if (!dt) return []
  const files = Array.from(dt.files).filter(isImageFile)
  const itemFiles = Array.from(dt.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => !!file && isImageFile(file))
  const seen = new Set<string>()
  return [...files, ...itemFiles].filter((file) => {
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const FabricEditor = forwardRef<FabricEditorHandle, FabricEditorProps>(
  function FabricEditor(
    {
      onReadyChange,
      persistId,
      persistDisplayName,
      initialArtboardWidth,
      initialArtboardHeight,
    },
    ref,
  ) {
  const persistIdRef = useRef<string | undefined>(undefined)
  persistIdRef.current = persistId
  const persistDisplayNameRef = useRef('')
  persistDisplayNameRef.current = persistDisplayName?.trim()
    ? persistDisplayName.trim()
    : 'Untitled'
  const idbAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const artboardFrameRef = useRef<HTMLDivElement>(null)
  const canvasZoomRef = useRef<HTMLDivElement>(null)
  const elementToolbarRef = useRef<HTMLDivElement>(null)
  const artboardClusterRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const zoomUserAdjustedRef = useRef(false)
  const selectionToolsRef = useRef<HTMLDivElement>(null)
  const shapeToolSplitRef = useRef<HTMLDivElement>(null)
  const bottomToolbarRef = useRef<HTMLDivElement>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  const fabricModRef = useRef<typeof import('fabric') | null>(null)
  const sceneHandleSizesRef = useRef<SceneHandleSizes | null>(null)
  const removeSceneSnapRef = useRef<(() => void) | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [artboardSize, setArtboardSize] = useState({
    w: DEFAULT_ARTBOARD_W,
    h: DEFAULT_ARTBOARD_H,
  })
  const artboardW = artboardSize.w
  const artboardH = artboardSize.h
  const artboardWRef = useRef(artboardW)
  const artboardHRef = useRef(artboardH)
  artboardWRef.current = artboardW
  artboardHRef.current = artboardH

  const layout = useMemo(
    () => ({
      fontSize: Math.round(artboardW * 0.04),
      rectW: Math.round(artboardW * 0.2),
      rectH: Math.round(artboardH * 0.12),
      rectRx: Math.round(artboardW * 0.004),
    }),
    [artboardW, artboardH],
  )

  const historySnapshotsRef = useRef<AvnacDocumentV1[]>([])
  const historyIndexRef = useRef(0)
  const applyingHistoryRef = useRef(false)
  const historyInitRef = useRef(false)

  const persistAfterMutation = useCallback(
    (canvas: Canvas | null | undefined, target?: FabricObject | null) => {
      if (!canvas || applyingHistoryRef.current) return
      const t = target ?? canvas.getActiveObject()
      if (t) canvas.fire('object:modified', { target: t })
    },
    [],
  )

  const [ready, setReady] = useState(false)
  const [zoomPercent, setZoomPercent] = useState<number | null>(null)
  const [bgValue, setBgValue] = useState<BgValue>({ type: 'solid', color: '#ffffff' })
  const bgValueRef = useRef(bgValue)
  bgValueRef.current = bgValue
  const [bgPopoverOpen, setBgPopoverOpen] = useState(false)
  const [selectedPaint, setSelectedPaint] = useState<BgValue>(DEFAULT_PAINT)
  const [hasObjectSelected, setHasObjectSelected] = useState(false)
  const [canvasBodySelected, setCanvasBodySelected] = useState(false)
  const [selectionRev, selectionTick] = useReducer((n: number) => n + 1, 0)
  const [textToolbarValues, setTextToolbarValues] =
    useState<TextFormatToolbarValues | null>(null)
  const [shapesPopoverOpen, setShapesPopoverOpen] = useState(false)
  const [shapesQuickAddKind, setShapesQuickAddKind] =
    useState<ShapesQuickAddKind>('generic')
  const [shapeToolbarModel, setShapeToolbarModel] = useState<{
    meta: AvnacShapeMeta
    paint: BgValue
    rectCornerRadius?: number
    rectCornerRadiusMax?: number
  } | null>(null)
  const [imageCornerToolbar, setImageCornerToolbar] = useState<{
    radius: number
    max: number
  } | null>(null)
  const [imageCropOpen, setImageCropOpen] = useState(false)
  const [imageCropSrc, setImageCropSrc] = useState('')
  const [imageCropInitial, setImageCropInitial] = useState({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  })
  const imageCropTargetRef = useRef<FabricImage | null>(null)
  const [selectionBlurPct, setSelectionBlurPct] = useState(0)
  const [selectionOpacityPct, setSelectionOpacityPct] = useState(100)
  const [selectionOutlineStrokeWidth, setSelectionOutlineStrokeWidth] =
    useState(0)
  const [selectionOutlineStrokePaint, setSelectionOutlineStrokePaint] =
    useState<BgValue>({ type: 'solid', color: '#000000' })
  const [selectionShadowUi, setSelectionShadowUi] =
    useState<FabricShadowUi>(DEFAULT_FABRIC_SHADOW_UI)
  const [selectionShadowActive, setSelectionShadowActive] = useState(false)
  const [artboardEmptyHovered, setArtboardEmptyHovered] = useState(false)
  const [editorSidebarPanel, setEditorSidebarPanel] =
    useState<EditorSidebarPanelId | null>(null)
  const [vectorBoards, setVectorBoards] = useState<AvnacVectorBoardMeta[]>([])
  const [vectorBoardDocs, setVectorBoardDocs] = useState<
    Record<string, VectorBoardDocument>
  >({})
  const vectorBoardDocsRef = useRef(vectorBoardDocs)
  vectorBoardDocsRef.current = vectorBoardDocs
  const [vectorBoardListReady, setVectorBoardListReady] = useState(false)
  const [vectorWorkspaceId, setVectorWorkspaceId] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] =
    useState<EditorContextMenuState | null>(null)
  const [elementToolbarLayout, setElementToolbarLayout] = useState<{
    left: number
    top: number
    placement: 'above' | 'below'
  } | null>(null)
  const [transformDimensionUi, setTransformDimensionUi] =
    useState<TransformDimensionUi | null>(null)

  const backgroundPopoverAnchorRef = useRef<HTMLDivElement>(null)
  const backgroundPopoverPanelRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const pickBackgroundPopoverPanel = useCallback(
    () => backgroundPopoverPanelRef.current,
    [],
  )
  const {
    openUpward: backgroundPopoverOpenUpward,
    shiftX: backgroundPopoverShiftX,
  } = useViewportAwarePopoverPlacement(
    bgPopoverOpen,
    backgroundPopoverAnchorRef,
    440,
    pickBackgroundPopoverPanel,
    'center',
  )

  useEffect(() => {
    if (!exportError) return
    const timeoutId = window.setTimeout(() => setExportError(null), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [exportError])

  const syncTextToolbar = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return

    const targets = canvas.getActiveObjects()
    const obj = canvas.getActiveObject()
    if (
      targets.length !== 1 ||
      !obj ||
      !(obj instanceof mod.IText)
    ) {
      setTextToolbarValues(null)
      return
    }

    setTextToolbarValues(readTextFormat(obj, layout.fontSize))
  }, [layout.fontSize])

  const syncShapeToolbar = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const targets = canvas.getActiveObjects()
    const obj = canvas.getActiveObject()
    const meta = getAvnacShapeMeta(obj)
    const shapeBarKind =
      meta &&
      (meta.kind === 'rect' ||
        meta.kind === 'ellipse' ||
        meta.kind === 'polygon' ||
        meta.kind === 'star' ||
        meta.kind === 'line' ||
        meta.kind === 'arrow')
    if (targets.length !== 1 || !obj || !shapeBarKind || !meta) {
      setShapeToolbarModel(null)
      return
    }
    let paint: BgValue
    if (meta.kind === 'line' && !(obj instanceof mod.Group)) {
      paint = bgValueFromFabricStroke(obj)
    } else if (isAvnacStrokeLineLike(meta) && obj instanceof mod.Group) {
      paint =
        getAvnacStroke(obj) ??
        ({ type: 'solid', color: arrowDisplayColor(obj) } satisfies BgValue)
    } else {
      paint = bgValueFromFabricFill(obj)
    }
    if (meta.kind === 'rect' && obj instanceof mod.Rect) {
      setShapeToolbarModel({
        meta: { ...meta },
        paint,
        rectCornerRadius: sceneCornerRadiusFromRect(obj),
        rectCornerRadiusMax: sceneCornerRadiusMaxForObject(obj),
      })
    } else {
      setShapeToolbarModel({ meta: { ...meta }, paint })
    }
    if (isAvnacStrokeLineLike(meta) && obj instanceof mod.Group) {
      syncAvnacArrowCurveControlVisibility(obj)
    }
    obj.setCoords()
  }, [])

  const syncImageCornerToolbar = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod?.FabricImage) {
      setImageCornerToolbar(null)
      return
    }
    const targets = canvas.getActiveObjects()
    const obj = canvas.getActiveObject()
    if (targets.length !== 1 || !obj || !(obj instanceof mod.FabricImage)) {
      setImageCornerToolbar(null)
      return
    }
    setImageCornerToolbar({
      radius: sceneCornerRadiusFromImage(obj, mod.Rect),
      max: sceneCornerRadiusMaxForObject(obj),
    })
  }, [])

  const syncSelectionBlur = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) {
      setSelectionBlurPct(0)
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setSelectionBlurPct(0)
      return
    }
    if ('multiSelectionStacking' in active) {
      const objs = canvas.getActiveObjects()
      if (objs.length === 0) {
        setSelectionBlurPct(0)
        return
      }
      let sum = 0
      for (const o of objs) {
        sum += readBlurPctFromFabricObject(o)
      }
      setSelectionBlurPct(Math.round(sum / objs.length))
      return
    }
    setSelectionBlurPct(readBlurPctFromFabricObject(active))
  }, [])

  const syncSelectionOpacity = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) {
      setSelectionOpacityPct(100)
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setSelectionOpacityPct(100)
      return
    }
    if ('multiSelectionStacking' in active) {
      const objs = canvas.getActiveObjects()
      if (objs.length === 0) {
        setSelectionOpacityPct(100)
        return
      }
      let sum = 0
      for (const o of objs) {
        sum += typeof o.opacity === 'number' ? o.opacity : 1
      }
      setSelectionOpacityPct(Math.round((sum / objs.length) * 100))
      return
    }
    const op = typeof active.opacity === 'number' ? active.opacity : 1
    setSelectionOpacityPct(Math.round(op * 100))
  }, [])

  const syncSelectionStroke = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) {
      setSelectionOutlineStrokeWidth(0)
      setSelectionOutlineStrokePaint({ type: 'solid', color: '#000000' })
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setSelectionOutlineStrokeWidth(0)
      setSelectionOutlineStrokePaint({ type: 'solid', color: '#000000' })
      return
    }
    const targets = collectOutlineStrokeTargets(active, mod, () =>
      canvas.getActiveObjects(),
    )
    if (targets.length === 0) {
      setSelectionOutlineStrokeWidth(0)
      setSelectionOutlineStrokePaint({ type: 'solid', color: '#000000' })
      return
    }
    let sum = 0
    for (const o of targets) {
      sum += typeof o.strokeWidth === 'number' ? o.strokeWidth : 0
    }
    setSelectionOutlineStrokeWidth(Math.round(sum / targets.length))
    const p0 = bgValueFromFabricStroke(targets[0])
    const same = targets.every((o) =>
      bgValuesShallowEqual(bgValueFromFabricStroke(o), p0),
    )
    setSelectionOutlineStrokePaint(
      same ? p0 : { type: 'solid', color: '#000000' },
    )
  }, [])

  const syncSelectionShadow = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) {
      setSelectionShadowUi({ ...DEFAULT_FABRIC_SHADOW_UI })
      setSelectionShadowActive(false)
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setSelectionShadowUi({ ...DEFAULT_FABRIC_SHADOW_UI })
      setSelectionShadowActive(false)
      return
    }
    if ('multiSelectionStacking' in active) {
      const objs = canvas.getActiveObjects()
      if (objs.length === 0) {
        setSelectionShadowUi({ ...DEFAULT_FABRIC_SHADOW_UI })
        setSelectionShadowActive(false)
        return
      }
      const any = objs.some((o) => readFabricShadowUi(o) !== null)
      setSelectionShadowActive(any)
      setSelectionShadowUi(averageFabricShadowUi(objs))
      return
    }
    const one = readFabricShadowUi(active)
    setSelectionShadowActive(one !== null)
    setSelectionShadowUi(one ?? { ...DEFAULT_FABRIC_SHADOW_UI })
  }, [])

  const onTextFormatChange = useCallback(
    (patch: Partial<TextFormatToolbarValues>) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const obj = canvas.getActiveObject()
      if (!(obj instanceof mod.IText)) return

      if (patch.fontFamily !== undefined) {
        loadGoogleFontFamily(patch.fontFamily)
        obj.set('fontFamily', patch.fontFamily)
      }
      if (patch.fontSize !== undefined) obj.set('fontSize', patch.fontSize)
      if (patch.fillStyle !== undefined) {
        applyBgValueToFill(mod, obj, patch.fillStyle)
        setSelectedPaint(patch.fillStyle)
      }
      if (patch.textAlign !== undefined) obj.set('textAlign', patch.textAlign)
      if (patch.bold !== undefined)
        obj.set('fontWeight', patch.bold ? '700' : '400')
      if (patch.italic !== undefined)
        obj.set('fontStyle', patch.italic ? 'italic' : 'normal')
      if (patch.underline !== undefined) obj.set('underline', patch.underline)

      if (obj instanceof mod.Textbox && textboxUsesAutoWidth(obj)) {
        fitTextboxWidthToContent(obj)
      }

      obj.setCoords()
      canvas.requestRenderAll()
      syncTextToolbar()
      persistAfterMutation(canvas, obj)
    },
    [persistAfterMutation, syncTextToolbar],
  )

  const applyPaintToSelection = useCallback(
    (v: BgValue) => {
      setSelectedPaint(v)
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const obj = canvas.getActiveObject() as FabricObject | undefined
      if (!obj) return
      const meta = getAvnacShapeMeta(obj)

      if (
        obj instanceof mod.Line ||
        (meta?.kind === 'line' && !(obj instanceof mod.Group))
      ) {
        applyBgValueToStroke(mod, obj, v)
      } else if (obj instanceof mod.Group && isAvnacStrokeLineLike(meta)) {
        setAvnacStroke(obj, v)
        const hex = bgValueSolidFallback(v)
        const parts = getArrowParts(obj)
        if (parts) {
          parts.shaft.set('stroke', hex)
          parts.head?.set('fill', hex)
        }
      } else if (obj instanceof mod.IText) {
        applyBgValueToFill(mod, obj, v)
      } else {
        applyBgValueToFill(mod, obj, v)
      }

      canvas.requestRenderAll()
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, obj)
    },
    [persistAfterMutation, syncShapeToolbar, syncTextToolbar],
  )

  const applyOpacityToSelection = useCallback(
    (pct: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const active = canvas.getActiveObject()
      if (!active) return
      const clamped = Math.max(0, Math.min(100, Math.round(pct)))
      const v = clamped / 100
      if ('multiSelectionStacking' in active) {
        for (const o of canvas.getActiveObjects()) {
          o.set('opacity', v)
          o.setCoords()
        }
      } else {
        active.set('opacity', v)
        active.setCoords()
      }
      canvas.requestRenderAll()
      setSelectionOpacityPct(clamped)
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, active)
    },
    [persistAfterMutation, syncShapeToolbar, syncTextToolbar],
  )

  const applyOutlineStrokeWidth = useCallback(
    (px: number) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const active = canvas.getActiveObject()
      if (!active) return
      const targets = collectOutlineStrokeTargets(active, mod, () =>
        canvas.getActiveObjects(),
      )
      if (targets.length === 0) return
      const w = Math.max(0, Math.min(40, Math.round(px)))
      for (const o of targets) {
        if (w > 0) {
          const s = o.stroke
          const noStrokePaint =
            s == null ||
            s === '' ||
            (typeof s === 'string' && s === 'transparent')
          if (noStrokePaint) {
            applyBgValueToStroke(mod, o, selectionOutlineStrokePaint)
          }
        }
        o.set({ strokeWidth: w })
        o.set('dirty', true)
        o.setCoords()
      }
      canvas.requestRenderAll()
      setSelectionOutlineStrokeWidth(w)
      syncSelectionStroke()
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, active)
    },
    [
      persistAfterMutation,
      selectionOutlineStrokePaint,
      syncSelectionStroke,
      syncShapeToolbar,
      syncTextToolbar,
    ],
  )

  const applyOutlineStrokePaint = useCallback(
    (v: BgValue) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const active = canvas.getActiveObject()
      if (!active) return
      const targets = collectOutlineStrokeTargets(active, mod, () =>
        canvas.getActiveObjects(),
      )
      if (targets.length === 0) return
      for (const o of targets) {
        applyBgValueToStroke(mod, o, v)
        o.set('dirty', true)
        o.setCoords()
      }
      canvas.requestRenderAll()
      setSelectionOutlineStrokePaint(v)
      syncSelectionStroke()
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, active)
    },
    [persistAfterMutation, syncSelectionStroke, syncShapeToolbar, syncTextToolbar],
  )

  const applyShadowToSelection = useCallback(
    (ui: FabricShadowUi) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const active = canvas.getActiveObject()
      if (!active) return
      const sh = buildFabricShadow(mod, ui)
      if ('multiSelectionStacking' in active) {
        for (const o of canvas.getActiveObjects()) {
          o.set('shadow', sh)
          o.set('dirty', true)
          o.setCoords()
        }
      } else {
        active.set('shadow', sh)
        active.set('dirty', true)
        active.setCoords()
      }
      canvas.requestRenderAll()
      setSelectionShadowUi(ui)
      setSelectionShadowActive(!!sh)
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, active)
    },
    [persistAfterMutation, syncShapeToolbar, syncTextToolbar],
  )

  const applyRectCornerRadius = useCallback(
    (px: number) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const obj = canvas.getActiveObject()
      if (!obj || !(obj instanceof mod.Rect)) return
      setSceneCornerRadiusOnRect(obj, px)
      canvas.requestRenderAll()
      selectionTick()
      syncShapeToolbar()
      persistAfterMutation(canvas, obj)
    },
    [persistAfterMutation, syncShapeToolbar],
  )

  const applyImageCornerRadius = useCallback((px: number) => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod?.FabricImage) return
    const obj = canvas.getActiveObject()
    if (!obj || !(obj instanceof mod.FabricImage)) return
    setSceneCornerRadiusOnImage(obj, px, mod)
    canvas.requestRenderAll()
    selectionTick()
    setImageCornerToolbar({
      radius: sceneCornerRadiusFromImage(obj, mod.Rect),
      max: sceneCornerRadiusMaxForObject(obj),
    })
    persistAfterMutation(canvas, obj)
  }, [persistAfterMutation])

  const openImageCropModal = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    const a = canvas?.getActiveObject()
    if (!canvas || !mod?.FabricImage || !(a instanceof mod.FabricImage)) return
    if (getAvnacLocked(a)) return
    imageCropTargetRef.current = a
    setImageCropSrc(a.getSrc())
    const r = getFabricImageSourceCrop(a)
    setImageCropInitial({ x: r.cropX, y: r.cropY, w: r.width, h: r.height })
    setImageCropOpen(true)
  }, [])

  const cancelImageCrop = useCallback(() => {
    setImageCropOpen(false)
    imageCropTargetRef.current = null
  }, [])

  const applyImageCropFromModal = useCallback(
    (rect: ImageCropModalApplyPayload) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      const img = imageCropTargetRef.current
      if (!canvas || !mod?.FabricImage || !img) {
        setImageCropOpen(false)
        imageCropTargetRef.current = null
        return
      }
      const sceneR = sceneCornerRadiusFromImage(img, mod.Rect)
      applyFabricImageSourceCrop(
        img,
        {
          cropX: rect.cropX,
          cropY: rect.cropY,
          width: rect.width,
          height: rect.height,
        },
        mod,
        sceneR,
      )
      canvas.requestRenderAll()
      selectionTick()
      setImageCornerToolbar({
        radius: sceneCornerRadiusFromImage(img, mod.Rect),
        max: sceneCornerRadiusMaxForObject(img),
      })
      persistAfterMutation(canvas, img)
      setImageCropOpen(false)
      imageCropTargetRef.current = null
    },
    [persistAfterMutation],
  )

  const applyBlurToSelection = useCallback(
    (pct: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const active = canvas.getActiveObject()
      if (!active) return
      const clamped = Math.max(0, Math.min(100, Math.round(pct)))
      if ('multiSelectionStacking' in active) {
        for (const o of canvas.getActiveObjects()) {
          o.set({ avnacBlur: clamped })
          o.set('dirty', true)
          o.setCoords()
        }
      } else {
        active.set({ avnacBlur: clamped })
        active.set('dirty', true)
        active.setCoords()
      }
      canvas.requestRenderAll()
      setSelectionBlurPct(clamped)
      syncTextToolbar()
      syncShapeToolbar()
      persistAfterMutation(canvas, active)
    },
    [persistAfterMutation, syncShapeToolbar, syncTextToolbar],
  )

  const syncSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    setHasObjectSelected(!!obj)
    if (!obj || !mod) {
      setSelectionOpacityPct(100)
      setSelectionBlurPct(0)
      setSelectionOutlineStrokeWidth(0)
      setSelectionOutlineStrokePaint({ type: 'solid', color: '#000000' })
      setSelectionShadowUi({ ...DEFAULT_FABRIC_SHADOW_UI })
      setSelectionShadowActive(false)
      selectionTick()
      return
    }
    if (obj instanceof mod.Line) {
      setSelectedPaint(bgValueFromFabricStroke(obj))
    } else if (
      obj instanceof mod.Group &&
      isAvnacStrokeLineLike(getAvnacShapeMeta(obj))
    ) {
      setSelectedPaint(
        getAvnacStroke(obj) ??
          ({ type: 'solid', color: arrowDisplayColor(obj) } satisfies BgValue),
      )
    } else {
      setSelectedPaint(bgValueFromFabricFill(obj))
    }
    syncSelectionOpacity()
    syncSelectionBlur()
    syncSelectionStroke()
    syncSelectionShadow()
    selectionTick()
  }, [
    syncSelectionBlur,
    syncSelectionOpacity,
    syncSelectionShadow,
    syncSelectionStroke,
  ])

  const addImageFromFiles = useCallback(
    (
      files: FileList | readonly File[] | null,
      atPoint?: { x: number; y: number },
    ) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod?.FabricImage) return
      const list = files
        ? Array.from(files).filter((f) => f.type.startsWith('image/'))
        : []
      if (list.length === 0) return
      const toProcess = atPoint ? list : list.slice(0, 1)
      const aw = artboardW
      const ah = artboardH
      const baseX = atPoint?.x ?? aw / 2
      const baseY = atPoint?.y ?? ah / 2
      const stagger = 12
      let remaining = toProcess.length
      const bumpDone = () => {
        remaining -= 1
        if (remaining === 0) syncSelection()
      }
      for (let i = 0; i < toProcess.length; i++) {
        const f = toProcess[i]!
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result
          if (typeof dataUrl !== 'string') {
            bumpDone()
            return
          }
          void mod.FabricImage.fromURL(dataUrl, {
            crossOrigin: 'anonymous',
          })
            .then((img) => {
              const dx = atPoint && toProcess.length > 1 ? i * stagger : 0
              const dy = atPoint && toProcess.length > 1 ? i * stagger : 0
              img.set({
                left: baseX + dx,
                top: baseY + dy,
                originX: 'center',
                originY: 'center',
              })
              const maxW = aw * 0.6
              const maxH = ah * 0.6
              const iw = img.width || 1
              const ih = img.height || 1
              if (iw > maxW || ih > maxH) {
                const sc = Math.min(maxW / iw, maxH / ih)
                img.scale(sc)
              }
              ensureAvnacLayerId(img)
              canvas.add(img)
              canvas.setActiveObject(img)
              canvas.requestRenderAll()
              bumpDone()
            })
            .catch(() => {
              bumpDone()
            })
        }
        reader.onerror = () => {
          bumpDone()
        }
        reader.readAsDataURL(f)
      }
    },
    [artboardW, artboardH, syncSelection],
  )

  const addImageFromRemoteUrl = useCallback(
    async (url: string, atPoint: { x: number; y: number }) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod?.FabricImage) return

      const aw = artboardW
      const ah = artboardH
      const maxW = aw * 0.6
      const maxH = ah * 0.6

      const place = (img: FabricImage) => {
        img.set({
          left: atPoint.x,
          top: atPoint.y,
          originX: 'center',
          originY: 'center',
        })
        const iw = img.width || 1
        const ih = img.height || 1
        if (iw > maxW || ih > maxH) {
          const sc = Math.min(maxW / iw, maxH / ih)
          img.scale(sc)
        }
        ensureAvnacLayerId(img)
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        syncSelection()
      }

      try {
        const img = await loadExportSafeFabricImage(mod, url)
        place(img)
      } catch {
        syncSelection()
      }
    },
    [artboardW, artboardH, syncSelection],
  )

  const syncFillFromSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    if (obj instanceof mod.Line) {
      setSelectedPaint(bgValueFromFabricStroke(obj))
      return
    }
    if (
      obj instanceof mod.Group &&
      isAvnacStrokeLineLike(getAvnacShapeMeta(obj))
    ) {
      setSelectedPaint(
        getAvnacStroke(obj) ??
          ({ type: 'solid', color: arrowDisplayColor(obj) } satisfies BgValue),
      )
      return
    }
    setSelectedPaint(bgValueFromFabricFill(obj))
  }, [])

  const applyCanvasZoom = useCallback(
    (pct: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const clamped = Math.max(
        ZOOM_MIN_PCT,
        Math.min(ZOOM_MAX_PCT, Math.round(pct)),
      )
      const s = clamped / 100
      const aw = artboardWRef.current
      const ah = artboardHRef.current
      const dw = aw * s
      const dh = ah * s
      canvas.setDimensions({ width: dw, height: dh }, { cssOnly: true })
      canvas.calcOffset()
      canvas.requestRenderAll()
      setZoomPercent(clamped)
      queueMicrotask(() => {
        syncTextToolbar()
        syncShapeToolbar()
      })
    },
    [syncTextToolbar, syncShapeToolbar],
  )

  const applyCanvasZoomRef = useRef(applyCanvasZoom)
  applyCanvasZoomRef.current = applyCanvasZoom

  useEffect(() => {
    if (!ready) return
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomUserAdjustedRef.current = true
      const current = zoomPercentRef.current ?? 100
      let dy = e.deltaY
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16
      else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE)
        dy *= Math.max(120, vp.clientHeight * 0.85)
      const deltaPct = -dy * 0.12
      applyCanvasZoomRef.current(current + deltaPct)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [ready])

  const fitArtboardToViewport = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !viewport) return

    const cw = viewport.clientWidth - FIT_PADDING * 2
    const ch = viewport.clientHeight - FIT_PADDING * 2
    if (cw <= 0 || ch <= 0) return

    const aw = artboardWRef.current
    const ah = artboardHRef.current
    const raw = Math.min(cw / aw, ch / ah) * 0.98
    const scale = Math.min(1, raw)
    const fitPct = Math.max(
      ZOOM_MIN_PCT,
      Math.min(ZOOM_MAX_PCT, Math.round(scale * 100)),
    )
    applyCanvasZoom(fitPct)
  }, [applyCanvasZoom])

  const onZoomSliderChange = useCallback(
    (pct: number) => {
      zoomUserAdjustedRef.current = true
      applyCanvasZoom(pct)
    },
    [applyCanvasZoom],
  )

  const onZoomFitRequest = useCallback(() => {
    zoomUserAdjustedRef.current = false
    fitArtboardToViewport()
  }, [fitArtboardToViewport])

  const updateElementToolbarLayout = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const frame = artboardFrameRef.current
    if (!canvas || !frame || !ready) {
      setElementToolbarLayout(null)
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setElementToolbarLayout(null)
      return
    }
    if ('isEditing' in active && (active as IText).isEditing) {
      setElementToolbarLayout(null)
      return
    }
    const br = active.getBoundingRect()
    const cw = canvas.getWidth()
    const ch = canvas.getHeight()
    const fw = frame.offsetWidth
    if (cw <= 0 || ch <= 0 || fw <= 0) {
      setElementToolbarLayout(null)
      return
    }
    const sx = fw / cw
    const sy = frame.offsetHeight / ch
    const centerX = (br.left + br.width / 2) * sx
    const topY = br.top * sy
    const bottomY = (br.top + br.height) * sy

    const cluster = artboardClusterRef.current
    const viewport = viewportRef.current
    const estToolbarH = 48
    const gap = 10
    const pad = 8
    let placement: 'above' | 'below' = 'above'
    let anchorY = topY
    if (cluster && viewport) {
      const cr = cluster.getBoundingClientRect()
      const vr = viewport.getBoundingClientRect()
      const anchorTopScreen = cr.top + topY
      const anchorBottomScreen = cr.top + bottomY
      const spaceAbove = anchorTopScreen - vr.top - pad
      const spaceBelow = vr.bottom - anchorBottomScreen - pad
      if (spaceAbove >= estToolbarH + gap) {
        placement = 'above'
        anchorY = topY
      } else if (spaceBelow >= estToolbarH + gap) {
        placement = 'below'
        anchorY = bottomY
      } else {
        placement = spaceAbove >= spaceBelow ? 'above' : 'below'
        anchorY = placement === 'above' ? topY : bottomY
      }
    }

    setElementToolbarLayout({ left: centerX, top: anchorY, placement })
  }, [ready])

  const refreshElementToolbarLayoutRef = useRef(updateElementToolbarLayout)
  refreshElementToolbarLayoutRef.current = updateElementToolbarLayout

  const syncFillFromSelectionRef = useRef(syncFillFromSelection)
  syncFillFromSelectionRef.current = syncFillFromSelection
  const syncTextToolbarRef = useRef(syncTextToolbar)
  syncTextToolbarRef.current = syncTextToolbar
  const syncShapeToolbarRef = useRef(syncShapeToolbar)
  syncShapeToolbarRef.current = syncShapeToolbar
  const syncSelectionOpacityRef = useRef(syncSelectionOpacity)
  syncSelectionOpacityRef.current = syncSelectionOpacity
  const syncSelectionBlurRef = useRef(syncSelectionBlur)
  syncSelectionBlurRef.current = syncSelectionBlur
  const syncSelectionStrokeRef = useRef(syncSelectionStroke)
  syncSelectionStrokeRef.current = syncSelectionStroke
  const syncSelectionShadowRef = useRef(syncSelectionShadow)
  syncSelectionShadowRef.current = syncSelectionShadow

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod || !ready) return
    if (bgValue.type === 'solid') {
      canvas.backgroundColor = bgValue.color
    } else {
      canvas.backgroundColor = linearGradientForBox(
        mod,
        bgValue.stops,
        bgValue.angle,
        artboardW,
        artboardH,
      )
    }
    canvas.requestRenderAll()
  }, [bgValue, ready, artboardW, artboardH])

  const zoomPercentRef = useRef(zoomPercent)
  zoomPercentRef.current = zoomPercent

  useEffect(() => {
    if (!ready) return
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return

    canvas.setDimensions({ width: artboardW, height: artboardH })
    const z = zoomPercentRef.current ?? 100
    const s = z / 100
    canvas.setDimensions(
      { width: artboardW * s, height: artboardH * s },
      { cssOnly: true },
    )
    canvas.calcOffset()

    removeSceneSnapRef.current?.()
    removeSceneSnapRef.current = installSceneSnap(canvas, {
      width: artboardW,
      height: artboardH,
      fabricMod: mod,
      guideColor: EDITOR_CANVAS_ACCENT,
    })

    canvas.requestRenderAll()
    queueMicrotask(() => {
      if (!zoomUserAdjustedRef.current) fitArtboardToViewport()
    })

    return () => {
      removeSceneSnapRef.current?.()
      removeSceneSnapRef.current = null
    }
  }, [ready, artboardW, artboardH, fitArtboardToViewport])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod || !ready) return
    const sizes = getSceneHandleSizesForArtboard(
      Math.min(artboardW, artboardH),
      zoomPercent,
    )
    sceneHandleSizesRef.current = sizes
    applySceneHandleSizesToCanvas(canvas, mod, sizes)
    refreshAvnacLineArrowHandleSizes(canvas, mod, sizes)
  }, [ready, artboardW, artboardH, zoomPercent])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod || !ready) return
    const onAdded = (opt: { target?: FabricObject | null }) => {
      const sizes = sceneHandleSizesRef.current
      if (!sizes || !opt.target) return
      const t = opt.target
      if (t instanceof mod.InteractiveFabricObject) {
        applySceneHandleSizesToInteractiveObject(t, sizes)
      }
      if (t instanceof mod.Line || t instanceof mod.Group) {
        refreshAvnacLineArrowHandleSizes(canvas, mod, sizes)
      }
      canvas.requestRenderAll()
    }
    canvas.on('object:added', onAdded)
    return () => canvas.off('object:added', onAdded)
  }, [ready])

  useLayoutEffect(() => {
    const el = canvasElRef.current
    if (!el) return

    let disposed = false
    let canvas: Canvas | null = null

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return
      if (t.closest('[data-avnac-chrome]')) return

      const c = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!c || !mod) return

      const active = c.getActiveObject()
      if (!active) return

      const dirX =
        e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
      const dirY = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
      const step = e.shiftKey ? 5 : 1
      const arrowDx = dirX * step
      const arrowDy = dirY * step
      const isArrow = dirX !== 0 || dirY !== 0

      if (isArrow) {
        if ('isEditing' in active && (active as IText).isEditing) return
        if (
          mod.ActiveSelection &&
          active instanceof mod.ActiveSelection &&
          active.getObjects().some((o) => getAvnacLocked(o))
        ) {
          return
        }
        if (
          !(mod.ActiveSelection && active instanceof mod.ActiveSelection) &&
          getAvnacLocked(active)
        ) {
          return
        }
        e.preventDefault()
        e.stopPropagation()
        if (mod.ActiveSelection && active instanceof mod.ActiveSelection) {
          active.getObjects().forEach((o) => {
            o.set({
              left: (o.left ?? 0) + arrowDx,
              top: (o.top ?? 0) + arrowDy,
            })
            o.setCoords()
          })
          active.setCoords()
        } else {
          active.set({
            left: (active.left ?? 0) + arrowDx,
            top: (active.top ?? 0) + arrowDy,
          })
          active.setCoords()
        }
        c.requestRenderAll()
        selectionTick()
        persistAfterMutation(c, active)
        syncTextToolbarRef.current()
        syncShapeToolbarRef.current()
        return
      }

      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      e.preventDefault()
      e.stopPropagation()
      if (!removeActiveObjectFromCanvas(c)) return
      c.requestRenderAll()
      setHasObjectSelected(false)
      setCanvasBodySelected(true)
      selectionTick()
      syncTextToolbarRef.current()
      syncShapeToolbarRef.current()
    }

    void (async () => {
      let mod: typeof import('fabric') | null = null
      try {
        mod = await import('fabric')
      } catch (err) {
        console.error('FabricEditor: failed to load fabric', err)
        return
      }
      if (disposed || !canvasElRef.current) return

      try {
        mod.config.configure({
          maxCacheSideLimit: 8192,
          perfLimitSizeTotal: 16 * 1024 * 1024,
        })
        Object.assign(mod.IText.ownDefaults, { objectCaching: false })

        for (const k of OBJECT_SERIAL_KEYS) {
          if (!mod.FabricObject.customProperties.includes(k)) {
            mod.FabricObject.customProperties.push(k)
          }
        }

        installAvnacObjectCanvasBlur(mod)

        fabricModRef.current = mod
        installFabricSelectionChrome(mod)
      } catch (err) {
        console.error('FabricEditor: failed to configure fabric', err)
        fabricModRef.current = null
        return
      }
      const aw0 = artboardWRef.current
      const ah0 = artboardHRef.current
      canvas = new mod.Canvas(canvasElRef.current, {
        width: aw0,
        height: ah0,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      })

      if (disposed) {
        void canvas.dispose()
        fabricModRef.current = null
        return
      }

      fabricCanvasRef.current = canvas
      attachFabricHoverOutline(canvas)

      const onAltDuplicateBefore = (opt: {
        e?: Event
        target?: FabricObject | null
      }) => {
        const cnv = fabricCanvasRef.current
        if (!cnv) return
        const e = opt.e as MouseEvent | undefined
        if (!e || e.button !== 0 || !e.altKey) return
        const active = cnv.getActiveObject()
        const hit = opt.target ?? undefined
        if (!active || !hit) return
        if ('isEditing' in active && (active as IText).isEditing) return
        const inSel =
          active === hit ||
          (!!mod.ActiveSelection &&
            active instanceof mod.ActiveSelection &&
            active.getObjects().includes(hit))
        if (!inSel) return
        if (
          mod.ActiveSelection &&
          active instanceof mod.ActiveSelection &&
          active.getObjects().some((o) => getAvnacLocked(o))
        ) {
          return
        }
        if (!(mod.ActiveSelection && active instanceof mod.ActiveSelection)) {
          if (getAvnacLocked(active)) return
        }
        if (hit.findControl(cnv.getViewportPoint(e), pointerIsTouch(e))) {
          return
        }

        void active.clone([...OBJECT_SERIAL_KEYS]).then((dup) => {
          const clearLock = (o: FabricObject) => {
            if (getAvnacLocked(o)) setAvnacLocked(o, false, mod)
          }
          const detachVb = (o: FabricObject) =>
            detachAvnacVectorBoardLink(o, mod)
          if (mod.ActiveSelection && dup instanceof mod.ActiveSelection) {
            dup.getObjects().forEach((o) => {
              clearLock(o)
              detachVb(o)
            })
          } else {
            clearLock(dup as FabricObject)
            detachVb(dup as FabricObject)
          }
          renewAvnacLayerId(dup as FabricObject)
          cnv.add(dup)
          cnv.discardActiveObject()
          cnv.setActiveObject(dup)
          dup.setCoords()
          const cPriv = cnv as unknown as {
            _setupCurrentTransform: (
              ev: MouseEvent,
              t: FabricObject,
              already: boolean,
            ) => void
          }
          cPriv._setupCurrentTransform(e, dup as FabricObject, false)
          cnv.requestRenderAll()
          selectionTick()
        })
      }

      canvas.on('mouse:down:before', onAltDuplicateBefore)

      const onSelect = () => {
        syncFillFromSelectionRef.current()
        setHasObjectSelected(true)
        setCanvasBodySelected(false)
        selectionTick()
        syncTextToolbarRef.current()
        syncShapeToolbarRef.current()
        syncSelectionOpacityRef.current()
        syncSelectionBlurRef.current()
        syncSelectionStrokeRef.current()
        syncSelectionShadowRef.current()
      }
      const onClear = () => {
        setHasObjectSelected(false)
        setCanvasBodySelected(true)
        setSelectedPaint(DEFAULT_PAINT)
        setTextToolbarValues(null)
        setShapeToolbarModel(null)
        setSelectionOpacityPct(100)
        setSelectionBlurPct(0)
        setSelectionOutlineStrokeWidth(0)
        setSelectionOutlineStrokePaint({ type: 'solid', color: '#000000' })
        setSelectionShadowUi({ ...DEFAULT_FABRIC_SHADOW_UI })
        setSelectionShadowActive(false)
        selectionTick()
      }

      const onCanvasMouseDown = (opt: { target?: FabricObject | null }) => {
        setArtboardEmptyHovered(!opt.target)
        if (opt.target) {
          setCanvasBodySelected(false)
        } else {
          setCanvasBodySelected(true)
        }
      }

      const onArtboardPointerMove = (opt: { target?: FabricObject | null }) => {
        const overEmpty = !opt.target
        setArtboardEmptyHovered((prev) =>
          prev === overEmpty ? prev : overEmpty,
        )
      }
      const onArtboardPointerOut = () => {
        setArtboardEmptyHovered((prev) => (prev ? false : prev))
      }

      canvas.on('selection:created', onSelect)
      canvas.on('selection:updated', onSelect)
      canvas.on('selection:cleared', onClear)
      canvas.on('mouse:down', onCanvasMouseDown)
      canvas.on('mouse:over', onArtboardPointerMove)
      canvas.on('mouse:move', onArtboardPointerMove)
      canvas.on('mouse:out', onArtboardPointerOut)

      window.addEventListener('keydown', onKeyDown)
      setReady(true)
      setHasObjectSelected(false)
      setCanvasBodySelected(true)

      if (disposed) {
        canvas.off('mouse:down:before', onAltDuplicateBefore)
        canvas.off('selection:created', onSelect)
        canvas.off('selection:updated', onSelect)
        canvas.off('selection:cleared', onClear)
        canvas.off('mouse:down', onCanvasMouseDown)
        canvas.off('mouse:over', onArtboardPointerMove)
        canvas.off('mouse:move', onArtboardPointerMove)
        canvas.off('mouse:out', onArtboardPointerOut)
        window.removeEventListener('keydown', onKeyDown)
        void canvas.dispose()
        fabricCanvasRef.current = null
        fabricModRef.current = null
        setReady(false)
      }
    })()

    return () => {
      disposed = true
      zoomUserAdjustedRef.current = false
      window.removeEventListener('keydown', onKeyDown)
      removeSceneSnapRef.current?.()
      removeSceneSnapRef.current = null
      const c = fabricCanvasRef.current
      fabricCanvasRef.current = null
      fabricModRef.current = null
      setReady(false)
      void c?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const viewport = viewportRef.current
    const canvas = fabricCanvasRef.current
    if (!viewport || !canvas) return

    const fit = () => {
      const c = fabricCanvasRef.current
      const v = viewportRef.current
      if (!c || !v) return
      if (!zoomUserAdjustedRef.current) {
        fitArtboardToViewport()
      } else {
        c.calcOffset()
        c.requestRenderAll()
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [ready, fitArtboardToViewport])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod || !ready) return

    const bump = () => {
      refreshElementToolbarLayoutRef.current()
      syncTextToolbar()
      syncShapeToolbar()
    }

    const onTextChanged = (opt: { target: unknown }) => {
      const target = opt.target
      if (
        target instanceof mod.Textbox &&
        textboxUsesAutoWidth(target)
      ) {
        fitTextboxWidthToContent(target)
        canvas.requestRenderAll()
      }
      bump()
    }

    const onModified = (opt: {
      target?: FabricObject
      action?: string
    }) => {
      const target = opt.target
      if (
        target instanceof mod.Textbox &&
        (opt.action === 'resizing' || opt.action === 'scaling')
      ) {
        disableTextboxAutoWidth(target)
      }
      if (
        target instanceof mod.Group &&
        isAvnacStrokeLineLike(getAvnacShapeMeta(target))
      ) {
        syncAvnacArrowEndpointsFromGeometry(target)
      }
      bump()
    }

    canvas.on('object:moving', bump)
    canvas.on('object:scaling', bump)
    canvas.on('object:rotating', bump)
    canvas.on('object:modified', onModified)
    canvas.on('text:changed', onTextChanged)
    return () => {
      canvas.off('object:moving', bump)
      canvas.off('object:scaling', bump)
      canvas.off('object:rotating', bump)
      canvas.off('object:modified', onModified)
      canvas.off('text:changed', onTextChanged)
    }
  }, [ready, syncTextToolbar, syncShapeToolbar])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || !ready) return
    const bump = () => {
      refreshElementToolbarLayoutRef.current()
      syncTextToolbar()
      syncShapeToolbar()
    }
    vp.addEventListener('scroll', bump, { passive: true })
    window.addEventListener('scroll', bump, { passive: true })
    window.addEventListener('resize', bump)
    return () => {
      vp.removeEventListener('scroll', bump)
      window.removeEventListener('scroll', bump)
      window.removeEventListener('resize', bump)
    }
  }, [ready, syncTextToolbar, syncShapeToolbar])

  useLayoutEffect(() => {
    if (!ready) return
    syncShapeToolbar()
    syncSelectionOpacity()
    syncSelectionBlur()
    syncSelectionStroke()
    syncSelectionShadow()
    syncImageCornerToolbar()
  }, [
    ready,
    selectionRev,
    zoomPercent,
    syncShapeToolbar,
    syncSelectionOpacity,
    syncSelectionBlur,
    syncSelectionStroke,
    syncSelectionShadow,
    syncImageCornerToolbar,
  ])

  useLayoutEffect(() => {
    if (!ready) return
    updateElementToolbarLayout()
  }, [
    ready,
    selectionRev,
    zoomPercent,
    hasObjectSelected,
    updateElementToolbarLayout,
  ])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !ready) return
    const ed = () => updateElementToolbarLayout()
    canvas.on('text:editing:entered', ed)
    canvas.on('text:editing:exited', ed)
    return () => {
      canvas.off('text:editing:entered', ed)
      canvas.off('text:editing:exited', ed)
    }
  }, [ready, updateElementToolbarLayout])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !ready) return

    const updateTransformDimensionOverlay = () => {
      const frame = artboardFrameRef.current
      if (!frame) return
      const target = canvas.getActiveObject()
      if (!target) {
        setTransformDimensionUi(null)
        return
      }
      if ('isEditing' in target && (target as IText).isEditing) {
        setTransformDimensionUi(null)
        return
      }
      const ui = computeTransformDimensionUi(canvas, frame, target)
      setTransformDimensionUi(ui)
    }

    const onModified = (opt: { action?: string }) => {
      if (opt.action && TRANSFORM_DIMENSION_END_ACTIONS.has(opt.action)) {
        setTransformDimensionUi(null)
      }
    }

    const hideOverlay = () => setTransformDimensionUi(null)

    canvas.on('object:scaling', updateTransformDimensionOverlay)
    canvas.on('object:resizing', updateTransformDimensionOverlay)
    canvas.on('object:skewing', updateTransformDimensionOverlay)
    canvas.on('object:modified', onModified)
    canvas.on('selection:cleared', hideOverlay)

    return () => {
      canvas.off('object:scaling', updateTransformDimensionOverlay)
      canvas.off('object:resizing', updateTransformDimensionOverlay)
      canvas.off('object:skewing', updateTransformDimensionOverlay)
      canvas.off('object:modified', onModified)
      canvas.off('selection:cleared', hideOverlay)
    }
  }, [ready])

  useEffect(() => {
    if (!transformDimensionUi || !ready) return
    const refresh = () => {
      const c = fabricCanvasRef.current
      const frame = artboardFrameRef.current
      if (!c || !frame) return
      const target = c.getActiveObject()
      if (!target) {
        setTransformDimensionUi(null)
        return
      }
      if ('isEditing' in target && (target as IText).isEditing) {
        setTransformDimensionUi(null)
        return
      }
      const ui = computeTransformDimensionUi(c, frame, target)
      if (ui) setTransformDimensionUi(ui)
    }
    const vp = viewportRef.current
    vp?.addEventListener('scroll', refresh, { passive: true })
    window.addEventListener('resize', refresh)
    return () => {
      vp?.removeEventListener('scroll', refresh)
      window.removeEventListener('resize', refresh)
    }
  }, [transformDimensionUi, ready])

  useEffect(() => {
    if (!shapesPopoverOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (shapeToolSplitRef.current?.contains(t)) return
      setShapesPopoverOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [shapesPopoverOpen])

  useEffect(() => {
    if (!bgPopoverOpen) return
    const onDoc = (e: MouseEvent) => {
      const n = e.target as Node
      if (selectionToolsRef.current?.contains(n)) return
      if (elementToolbarRef.current?.contains(n)) return
      if ((n as Element).closest?.('[data-avnac-chrome]')) return
      setBgPopoverOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [bgPopoverOpen])

  useEffect(() => {
    if (!canvasBodySelected) setBgPopoverOpen(false)
  }, [canvasBodySelected])

  useEffect(() => {
    if (!ready) return

    const onDocMouseDown = (e: MouseEvent) => {
      const c = fabricCanvasRef.current
      if (!c) return
      const t = e.target as Node
      if (selectionToolsRef.current?.contains(t)) return
      if (bottomToolbarRef.current?.contains(t)) return
      if (canvasZoomRef.current?.contains(t)) return
      if (elementToolbarRef.current?.contains(t)) return
      if ((t as Element).closest?.('[data-avnac-chrome]')) return
      if (isEventOnFabricCanvas(c, t)) return

      if (c.getActiveObject()) {
        c.discardActiveObject()
        c.requestRenderAll()
      } else {
        setCanvasBodySelected(false)
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [ready])

  function addText() {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    loadGoogleFontFamily('Inter')
    const t = new mod.Textbox('Your text', {
      left: artboardW / 2,
      top: artboardH / 2,
      originX: 'center',
      originY: 'center',
      width: 20,
      fontSize: layout.fontSize,
      fill: bgValueSolidFallback(selectedPaint),
      fontFamily: 'Inter',
    })
    t.setControlsVisibility({ mt: false, mb: false })
    enableTextboxAutoWidth(t)
    fitTextboxWidthToContent(t)
    applyBgValueToFill(mod, t, selectedPaint)
    ensureAvnacLayerId(t)
    canvas.add(t)
    canvas.setActiveObject(t)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addRect() {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const side = Math.round(Math.min(artboardW, artboardH) * 0.18)
    const r = new mod.Rect({
      left: artboardW / 2 - side / 2,
      top: artboardH / 2 - side / 2,
      width: side,
      height: side,
      fill: bgValueSolidFallback(selectedPaint),
      rx: 0,
      ry: 0,
    })
    setAvnacShapeMeta(r, { kind: 'rect' })
    applyBgValueToFill(mod, r, selectedPaint)
    ensureAvnacLayerId(r)
    canvas.add(r)
    canvas.setActiveObject(r)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addEllipseShape() {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const r = Math.round(Math.min(layout.rectW, layout.rectH) / 2)
    const e = new mod.Ellipse({
      left: artboardW / 2,
      top: artboardH / 2,
      rx: r,
      ry: r,
      fill: bgValueSolidFallback(selectedPaint),
      originX: 'center',
      originY: 'center',
    })
    setAvnacShapeMeta(e, { kind: 'ellipse' })
    applyBgValueToFill(mod, e, selectedPaint)
    ensureAvnacLayerId(e)
    canvas.add(e)
    canvas.setActiveObject(e)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addPolygonShape(sides = 6) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const R = Math.round(layout.rectW * 0.36)
    const pts = regularPolygonPoints(sides, R)
    const p = new mod.Polygon(pts, {
      left: artboardW / 2,
      top: artboardH / 2,
      fill: bgValueSolidFallback(selectedPaint),
      originX: 'center',
      originY: 'center',
    })
    setAvnacShapeMeta(p, { kind: 'polygon', polygonSides: sides })
    applyBgValueToFill(mod, p, selectedPaint)
    ensureAvnacLayerId(p)
    canvas.add(p)
    canvas.setActiveObject(p)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addStarShape(points = 5) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const R = Math.round(layout.rectW * 0.38)
    const pts = starPolygonPoints(points, R)
    const p = new mod.Polygon(pts, {
      left: artboardW / 2,
      top: artboardH / 2,
      fill: bgValueSolidFallback(selectedPaint),
      originX: 'center',
      originY: 'center',
    })
    setAvnacShapeMeta(p, { kind: 'star', starPoints: points })
    applyBgValueToFill(mod, p, selectedPaint)
    ensureAvnacLayerId(p)
    canvas.add(p)
    canvas.setActiveObject(p)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addLineShape() {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const half = Math.round(layout.rectW * 0.42)
    const cx = artboardW / 2
    const cy = artboardH / 2
    const x1 = cx - half
    const y1 = cy
    const x2 = cx + half
    const y2 = cy
    const strokeW = 10
    const g = createArrowGroup(mod, x1, y1, x2, y2, {
      strokeWidth: strokeW,
      headFrac: 0,
      color: bgValueSolidFallback(selectedPaint),
    })
    setAvnacStroke(g, selectedPaint)
    setAvnacShapeMeta(g, {
      kind: 'line',
      arrowHead: 0,
      arrowEndpoints: { x1, y1, x2, y2 },
      arrowStrokeWidth: strokeW,
      arrowLineStyle: 'solid',
      arrowRoundedEnds: false,
      arrowPathType: 'straight',
    })
    installArrowEndpointControls(g)
    ensureAvnacLayerId(g)
    canvas.add(g)
    canvas.setActiveObject(g)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addArrowShape() {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const head = 1
    const cx = artboardW / 2
    const cy = artboardH / 2
    const half = Math.round(layout.rectW * 0.42)
    const x1 = cx - half
    const y1 = cy
    const x2 = cx + half
    const y2 = cy
    const strokeW = 10
    const g = createArrowGroup(mod, x1, y1, x2, y2, {
      strokeWidth: strokeW,
      headFrac: head,
      color: bgValueSolidFallback(selectedPaint),
    })
    setAvnacStroke(g, selectedPaint)
    setAvnacShapeMeta(g, {
      kind: 'arrow',
      arrowHead: head,
      arrowEndpoints: { x1, y1, x2, y2 },
      arrowStrokeWidth: strokeW,
      arrowLineStyle: 'solid',
      arrowRoundedEnds: false,
      arrowPathType: 'straight',
    })
    installArrowEndpointControls(g)
    ensureAvnacLayerId(g)
    canvas.add(g)
    canvas.setActiveObject(g)
    canvas.requestRenderAll()
    syncSelection()
  }

  function addShapeFromPopover(kind: PopoverShapeKind) {
    if (kind === 'rect') addRect()
    else if (kind === 'ellipse') addEllipseShape()
    else if (kind === 'polygon') addPolygonShape(6)
    else if (kind === 'star') addStarShape(5)
    else if (kind === 'line') addLineShape()
    else if (kind === 'arrow') addArrowShape()
  }

  function addQuickShape() {
    const kind: PopoverShapeKind =
      shapesQuickAddKind === 'generic' ? 'rect' : shapesQuickAddKind
    addShapeFromPopover(kind)
  }

  function applyPolygonSides(sides: number) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Polygon)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || meta.kind !== 'polygon') return
    const n = Math.max(3, Math.min(32, Math.round(sides)))
    const R = outerRadiusFromScaledPolygon(obj)
    const pts = regularPolygonPoints(n, R)
    obj.set({ points: pts, scaleX: 1, scaleY: 1 })
    setAvnacShapeMeta(obj, { ...meta, polygonSides: n })
    obj.setCoords()
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  function applyStarPoints(points: number) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Polygon)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || meta.kind !== 'star') return
    const n = Math.max(3, Math.min(24, Math.round(points)))
    const R = outerRadiusFromScaledPolygon(obj)
    const pts = starPolygonPoints(n, R)
    obj.set({ points: pts, scaleX: 1, scaleY: 1 })
    setAvnacShapeMeta(obj, { ...meta, starPoints: n })
    obj.setCoords()
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  function applyArrowLineStyle(style: ArrowLineStyle) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Group)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || !isAvnacStrokeLineLike(meta)) return
    ensureAvnacArrowEndpoints(obj)
    const m = getAvnacShapeMeta(obj)
    const ep = m?.arrowEndpoints
    if (!m || !ep) return
    const strokeW = m.arrowStrokeWidth ?? 10
    const color = arrowDisplayColor(obj)
    layoutArrowGroup(obj, ep.x1, ep.y1, ep.x2, ep.y2, {
      strokeWidth: strokeW,
      headFrac: avnacStrokeLineHeadFrac(m),
      color,
      lineStyle: style,
      roundedEnds: m?.arrowRoundedEnds,
      pathType: m?.arrowPathType ?? 'straight',
      curveBulge: m?.arrowCurveBulge,
      curveT: m?.arrowCurveT,
    })
    setAvnacShapeMeta(obj, { ...m, arrowLineStyle: style })
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  function applyArrowRoundedEnds(rounded: boolean) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Group)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || !isAvnacStrokeLineLike(meta)) return
    ensureAvnacArrowEndpoints(obj)
    const m = getAvnacShapeMeta(obj)
    const ep = m?.arrowEndpoints
    if (!m || !ep) return
    const strokeW = m.arrowStrokeWidth ?? 10
    const color = arrowDisplayColor(obj)
    layoutArrowGroup(obj, ep.x1, ep.y1, ep.x2, ep.y2, {
      strokeWidth: strokeW,
      headFrac: avnacStrokeLineHeadFrac(m),
      color,
      lineStyle: m.arrowLineStyle,
      roundedEnds: rounded,
      pathType: m?.arrowPathType ?? 'straight',
      curveBulge: m?.arrowCurveBulge,
      curveT: m?.arrowCurveT,
    })
    setAvnacShapeMeta(obj, { ...m, arrowRoundedEnds: rounded })
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  function applyArrowStrokeWidth(w: number) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Group)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || !isAvnacStrokeLineLike(meta)) return
    const strokeW = Math.max(1, Math.min(80, w))
    ensureAvnacArrowEndpoints(obj)
    const m = getAvnacShapeMeta(obj)
    const ep = m?.arrowEndpoints
    if (!m || !ep) return
    const color = arrowDisplayColor(obj)
    layoutArrowGroup(obj, ep.x1, ep.y1, ep.x2, ep.y2, {
      strokeWidth: strokeW,
      headFrac: avnacStrokeLineHeadFrac(m),
      color,
      lineStyle: m.arrowLineStyle,
      roundedEnds: m.arrowRoundedEnds,
      pathType: m.arrowPathType ?? 'straight',
      curveBulge: m.arrowCurveBulge,
      curveT: m.arrowCurveT,
    })
    setAvnacShapeMeta(obj, { ...m, arrowStrokeWidth: strokeW })
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  function applyArrowPathType(pathType: ArrowPathType) {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!(obj instanceof mod.Group)) return
    const meta = getAvnacShapeMeta(obj)
    if (!meta || !isAvnacStrokeLineLike(meta)) return
    ensureAvnacArrowEndpoints(obj)
    const m = getAvnacShapeMeta(obj)
    const ep = m?.arrowEndpoints
    if (!m || !ep) return
    const strokeW = m.arrowStrokeWidth ?? 10
    const color = arrowDisplayColor(obj)
    layoutArrowGroup(obj, ep.x1, ep.y1, ep.x2, ep.y2, {
      strokeWidth: strokeW,
      headFrac: avnacStrokeLineHeadFrac(m),
      color,
      lineStyle: m.arrowLineStyle,
      roundedEnds: m.arrowRoundedEnds,
      pathType,
      curveBulge: pathType === 'curved' ? m.arrowCurveBulge : undefined,
      curveT: pathType === 'curved' ? m.arrowCurveT : undefined,
    })
    setAvnacShapeMeta(obj, {
      ...m,
      arrowPathType: pathType,
      ...(pathType === 'straight'
        ? { arrowCurveBulge: undefined, arrowCurveT: undefined }
        : {}),
    })
    syncAvnacArrowCurveControlVisibility(obj)
    canvas.requestRenderAll()
    syncShapeToolbar()
    persistAfterMutation(canvas, obj)
  }

  const duplicateElement = useCallback(async () => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const active = canvas.getActiveObject()
    if (!active) return
    if ('isEditing' in active && (active as IText).isEditing) return

    const dup = await active.clone([...OBJECT_SERIAL_KEYS])
    dup.set({ left: (active.left ?? 0) + 32, top: (active.top ?? 0) + 32 })
    const clearLock = (o: FabricObject) => {
      if (getAvnacLocked(o)) setAvnacLocked(o, false, mod)
    }
    const detachVb = (o: FabricObject) => detachAvnacVectorBoardLink(o, mod)
    if (mod.ActiveSelection && dup instanceof mod.ActiveSelection) {
      dup.getObjects().forEach((o) => {
        clearLock(o)
        detachVb(o)
      })
    } else {
      clearLock(dup as FabricObject)
      detachVb(dup as FabricObject)
    }
    renewAvnacLayerId(dup as FabricObject)
    canvas.discardActiveObject()
    canvas.add(dup)
    canvas.setActiveObject(dup)
    canvas.requestRenderAll()
    selectionTick()
  }, [])

  const toggleElementLock = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const active = canvas.getActiveObject()
    if (!active) return
    if (mod.ActiveSelection && active instanceof mod.ActiveSelection) {
      const objs = active.getObjects()
      const anyUnlocked = objs.some((o) => !getAvnacLocked(o))
      const nextLocked = anyUnlocked
      objs.forEach((o) => setAvnacLocked(o, nextLocked, mod))
    } else {
      setAvnacLocked(active, !getAvnacLocked(active), mod)
    }
    canvas.requestRenderAll()
    selectionTick()
  }, [])

  const copyElementToClipboard = useCallback(async () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const objs = canvas.getActiveObjects()
    if (objs.length === 0) return
    const objects = objs.map((o) =>
      o.toObject([...OBJECT_SERIAL_KEYS] as unknown as string[]),
    )
    const payload = JSON.stringify({ avnacClip: true, v: 1, objects })
    try {
      await navigator.clipboard.writeText(payload)
    } catch {
      /* clipboard may be blocked */
    }
  }, [])

  const pasteAvnacClipText = useCallback(async (
    text: string,
    atPoint?: { x: number; y: number },
  ): Promise<boolean> => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return false
    let parsed: { avnacClip?: boolean; objects?: unknown[] }
    try {
      parsed = JSON.parse(text) as { avnacClip?: boolean; objects?: unknown[] }
    } catch {
      return false
    }
    if (!parsed.avnacClip || !Array.isArray(parsed.objects)) return false

    const objs = (await mod.util.enlivenObjects(
      parsed.objects as object[],
      {},
    )) as FabricObject[]

    let dx = 32
    let dy = 32
    if (atPoint && objs.length > 0) {
      objs.forEach((o) => o.setCoords())
      const rects = objs.map((o) => o.getBoundingRect())
      const left = Math.min(...rects.map((r) => r.left))
      const top = Math.min(...rects.map((r) => r.top))
      const right = Math.max(...rects.map((r) => r.left + r.width))
      const bottom = Math.max(...rects.map((r) => r.top + r.height))
      dx = atPoint.x - (left + right) / 2
      dy = atPoint.y - (top + bottom) / 2
    }
    objs.forEach((o) => {
      o.set({
        left: (o.left ?? 0) + dx,
        top: (o.top ?? 0) + dy,
      })
      renewAvnacLayerId(o)
      detachAvnacVectorBoardLink(o, mod)
      canvas.add(o)
    })
    canvas.discardActiveObject()
    if (objs.length === 1) {
      canvas.setActiveObject(objs[0]!)
    } else if (objs.length > 1) {
      const sel = new mod.ActiveSelection(objs, { canvas })
      canvas.setActiveObject(sel)
    }
    canvas.requestRenderAll()
    setHasObjectSelected(true)
    setCanvasBodySelected(false)
    selectionTick()
    syncTextToolbar()
    syncShapeToolbar()
    try {
      await loadCanvasGoogleFontsAndRelayout(canvas, mod)
    } catch (err) {
      console.error('FabricEditor: font reload after paste failed', err)
    }
    return true
  }, [syncShapeToolbar, syncTextToolbar])

  const pasteFromClipboard = useCallback(async (atPoint?: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    try {
      const imageFiles = await readClipboardImageFiles()
      if (imageFiles.length > 0) {
        addImageFromFiles(imageFiles, atPoint)
        return
      }
    } catch {
      /* Async clipboard image reads are permission-gated in some browsers. */
    }
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }
    await pasteAvnacClipText(text, atPoint)
  }, [addImageFromFiles, pasteAvnacClipText])

  const alignElementToArtboard = useCallback((kind: CanvasAlignKind) => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    const pad = ARTBOARD_ALIGN_PAD
    const br = obj.getBoundingRect()
    let dx = 0
    let dy = 0
    if (kind === 'left') dx = pad - br.left
    else if (kind === 'centerH')
      dx = artboardW / 2 - br.left - br.width / 2
    else if (kind === 'right') dx = artboardW - pad - br.left - br.width
    else if (kind === 'top') dy = pad - br.top
    else if (kind === 'centerV')
      dy = artboardH / 2 - br.top - br.height / 2
    else if (kind === 'bottom') dy = artboardH - pad - br.top - br.height

    if (mod.ActiveSelection && obj instanceof mod.ActiveSelection) {
      obj.getObjects().forEach((o) => {
        o.set({
          left: (o.left ?? 0) + dx,
          top: (o.top ?? 0) + dy,
        })
        o.setCoords()
      })
      obj.setCoords()
    } else {
      obj.set({
        left: (obj.left ?? 0) + dx,
        top: (obj.top ?? 0) + dy,
      })
      obj.setCoords()
    }
    canvas.requestRenderAll()
    selectionTick()
    persistAfterMutation(canvas, obj)
  }, [persistAfterMutation])

  const alignSelectedElements = useCallback((kind: CanvasAlignKind) => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    alignSelectedObjectsRelative(canvas, mod, kind)
    selectionTick()
    syncTextToolbar()
    syncShapeToolbar()
    persistAfterMutation(canvas, canvas.getActiveObject())
  }, [persistAfterMutation, syncShapeToolbar, syncTextToolbar])

  const groupSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod?.ActiveSelection) return
    const active = canvas.getActiveObject()
    if (!(active instanceof mod.ActiveSelection)) return
    const objs = active.getObjects()
    if (objs.length < 2) return
    for (const o of objs) {
      if ('isEditing' in o && (o as IText).isEditing) return
    }
    const snapshot = [...objs]
    canvas.discardActiveObject()
    for (const o of snapshot) canvas.remove(o)
    const group = new mod.Group(snapshot, { canvas })
    ensureAvnacLayerId(group)
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    setHasObjectSelected(true)
    setCanvasBodySelected(false)
    selectionTick()
    syncTextToolbar()
    syncShapeToolbar()
  }, [syncShapeToolbar, syncTextToolbar])

  const ungroupSelection = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    const g = canvas.getActiveObject()
    if (!g || !(g instanceof mod.Group)) return
    if (mod.ActiveSelection && g instanceof mod.ActiveSelection) return
    const meta = getAvnacShapeMeta(g)
    if (isAvnacStrokeLineLike(meta)) return

    canvas.discardActiveObject()
    const items = g.removeAll()
    canvas.remove(g)
    for (const o of items) {
      canvas.add(o)
    }
    if (items.length === 1) {
      canvas.setActiveObject(items[0]!)
    } else if (items.length > 1) {
      const sel = new mod.ActiveSelection(items, { canvas })
      canvas.setActiveObject(sel)
    }
    canvas.requestRenderAll()
    setHasObjectSelected(items.length > 0)
    setCanvasBodySelected(items.length === 0)
    selectionTick()
    syncTextToolbar()
    syncShapeToolbar()
  }, [syncShapeToolbar, syncTextToolbar])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== 'g' && e.key !== 'G') return
      e.preventDefault()
      if (e.shiftKey) ungroupSelection()
      else groupSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, groupSelection, ungroupSelection])

  function deleteSelection() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    if (!canvas.getActiveObject()) return
    if (!removeActiveObjectFromCanvas(canvas)) return
    canvas.requestRenderAll()
    setHasObjectSelected(false)
    setCanvasBodySelected(true)
    selectionTick()
    syncTextToolbar()
    syncShapeToolbar()
  }

  const captureDoc = useCallback((): AvnacDocumentV1 => {
    const canvas = fabricCanvasRef.current
    const fabricJson =
      canvas?.toObject([...OBJECT_SERIAL_KEYS] as unknown as string[]) ??
      ({ objects: [] } as Record<string, unknown>)
    return {
      v: AVNAC_DOC_VERSION,
      artboard: {
        width: artboardWRef.current,
        height: artboardHRef.current,
      },
      bg: bgValueRef.current,
      fabric: fabricJson as Record<string, unknown>,
    }
  }, [])

  const applyDoc = useCallback(
    async (doc: AvnacDocumentV1) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      applyingHistoryRef.current = true
      try {
        artboardWRef.current = doc.artboard.width
        artboardHRef.current = doc.artboard.height
        setArtboardSize({
          w: doc.artboard.width,
          h: doc.artboard.height,
        })
        setBgValue(doc.bg)
        await canvas.loadFromJSON(doc.fabric)
        try {
          await normalizeCanvasImagesForExport(canvas, mod)
        } catch (err) {
          console.error('FabricEditor: remote image normalization failed', err)
        }
        for (const o of canvas.getObjects()) ensureAvnacLayerId(o)
        try {
          migrateLegacyImageBlurFilters(canvas, mod)
        } catch (err) {
          console.error('FabricEditor: legacy blur migration failed', err)
        }
        try {
          await loadCanvasGoogleFontsAndRelayout(canvas, mod)
        } catch (err) {
          console.error('FabricEditor: font reload failed', err)
        }
        const z = zoomPercentRef.current ?? 100
        const s = z / 100
        canvas.setDimensions({
          width: doc.artboard.width,
          height: doc.artboard.height,
        })
        canvas.setDimensions(
          {
            width: doc.artboard.width * s,
            height: doc.artboard.height * s,
          },
          { cssOnly: true },
        )
        canvas.calcOffset()
        removeSceneSnapRef.current?.()
        removeSceneSnapRef.current = installSceneSnap(canvas, {
          width: doc.artboard.width,
          height: doc.artboard.height,
          fabricMod: mod,
          guideColor: EDITOR_CANVAS_ACCENT,
        })
        canvas.discardActiveObject()
        canvas.requestRenderAll()
        setHasObjectSelected(false)
        setCanvasBodySelected(true)
        selectionTick()
        syncTextToolbar()
        syncShapeToolbar()
        queueMicrotask(() => {
          const c = fabricCanvasRef.current
          const m = fabricModRef.current
          if (!c || !m) return
          refreshAllVectorBoardInstances(c, m, vectorBoardDocsRef.current)
        })
      } finally {
        applyingHistoryRef.current = false
      }
    },
    [syncTextToolbar, syncShapeToolbar],
  )

  const captureDocRef = useRef(captureDoc)
  captureDocRef.current = captureDoc
  const applyDocRef = useRef(applyDoc)
  applyDocRef.current = applyDoc

  const scheduleIdbAutosave = useCallback(() => {
    const pid = persistIdRef.current
    if (!pid) return
    if (idbAutosaveTimerRef.current) clearTimeout(idbAutosaveTimerRef.current)
    idbAutosaveTimerRef.current = setTimeout(() => {
      idbAutosaveTimerRef.current = null
      void idbPutDocument(pid, captureDocRef.current(), {
        name: persistDisplayNameRef.current,
      }).catch((err) => {
        console.error('FabricEditor: IndexedDB autosave failed', err)
      })
    }, 500)
  }, [])

  const commitHistory = useCallback(() => {
    if (!ready || applyingHistoryRef.current) return
    const snap = captureDoc()
    const ser = JSON.stringify(snap)
    const past = historySnapshotsRef.current
    const idx = historyIndexRef.current
    if (past[idx] && JSON.stringify(past[idx]) === ser) return
    past.splice(idx + 1)
    past.push(snap)
    historyIndexRef.current = past.length - 1
    if (past.length > 50) {
      past.shift()
      historyIndexRef.current--
    }
    try {
      if (!persistIdRef.current) {
        localStorage.setItem(AVNAC_STORAGE_KEY, ser)
      }
    } catch {
      /* ignore */
    }
    scheduleIdbAutosave()
  }, [ready, captureDoc, scheduleIdbAutosave])

  const undo = useCallback(async () => {
    if (applyingHistoryRef.current) return
    const past = historySnapshotsRef.current
    let idx = historyIndexRef.current
    if (idx <= 0) return
    idx -= 1
    historyIndexRef.current = idx
    await applyDoc(past[idx]!)
    scheduleIdbAutosave()
  }, [applyDoc, scheduleIdbAutosave])

  const redo = useCallback(async () => {
    if (applyingHistoryRef.current) return
    const past = historySnapshotsRef.current
    let idx = historyIndexRef.current
    if (idx >= past.length - 1) return
    idx += 1
    historyIndexRef.current = idx
    await applyDoc(past[idx]!)
    scheduleIdbAutosave()
  }, [applyDoc, scheduleIdbAutosave])

  const createVectorBoard = useCallback(() => {
    const id = crypto.randomUUID()
    setVectorBoards((prev) => {
      const n = prev.length + 1
      return [
        ...prev,
        { id, name: `Vector board ${n}`, createdAt: Date.now() },
      ]
    })
    setVectorBoardDocs((prev) => {
      const next = { ...prev, [id]: emptyVectorBoardDocument() }
      vectorBoardDocsRef.current = next
      return next
    })
    setVectorWorkspaceId(id)
  }, [])

  const placeVectorBoardOnCanvas = useCallback(
    (boardId: string, sceneX: number, sceneY: number) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const doc = vectorBoardDocsRef.current[boardId]
      if (!doc || !vectorDocHasRenderableStrokes(doc)) return
      const group = createVectorBoardFabricGroup(mod, doc, boardId)
      ensureAvnacLayerId(group)
      group.set({
        left: sceneX,
        top: sceneY,
        originX: 'center',
        originY: 'center',
      })
      group.setCoords()
      canvas.discardActiveObject()
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      selectionTick()
      persistAfterMutation(canvas, group)
    },
    [persistAfterMutation],
  )

  const placeActiveVectorBoardAtArtboardCenter = useCallback(() => {
    if (!vectorWorkspaceId) return
    const doc = vectorBoardDocsRef.current[vectorWorkspaceId]
    if (!doc || !vectorDocHasRenderableStrokes(doc)) return
    placeVectorBoardOnCanvas(
      vectorWorkspaceId,
      artboardWRef.current / 2,
      artboardHRef.current / 2,
    )
  }, [placeVectorBoardOnCanvas, vectorWorkspaceId])

  const onVectorBoardDocumentChange = useCallback(
    (boardId: string, doc: VectorBoardDocument) => {
      setVectorBoardDocs((prev) => {
        const next = { ...prev, [boardId]: doc }
        vectorBoardDocsRef.current = next
        return next
      })
      queueMicrotask(() => {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod) return
        syncVectorBoardInstancesToDoc(canvas, mod, boardId, doc)
        for (const o of canvas.getObjects()) {
          if (!(o instanceof mod.Group)) continue
          const wid = (
            o as FabricObject & { avnacVectorBoardId?: string }
          ).avnacVectorBoardId
          if (wid === boardId) {
            canvas.fire('object:modified', { target: o })
          }
        }
        canvas.requestRenderAll()
      })
    },
    [],
  )

  const onVectorBoardDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onViewportDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      const boardId = e.dataTransfer.getData(AVNAC_VECTOR_BOARD_DRAG_MIME)
      if (boardId) {
        const p = canvas.getScenePoint(e.nativeEvent)
        placeVectorBoardOnCanvas(boardId, p.x, p.y)
        return
      }
      const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      )
      const p = canvas.getScenePoint(e.nativeEvent)
      if (imageFiles.length > 0) {
        addImageFromFiles(imageFiles, { x: p.x, y: p.y })
        return
      }
      const remoteUrl = extractImageUrlFromDataTransfer(e.dataTransfer)
      if (remoteUrl) {
        void addImageFromRemoteUrl(remoteUrl, { x: p.x, y: p.y })
      }
    },
    [addImageFromFiles, addImageFromRemoteUrl, placeVectorBoardOnCanvas],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const onViewportContextMenu = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!ready || vectorWorkspaceId) return
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, [contenteditable="true"]')) return
    const canvas = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!canvas || !mod) return
    e.preventDefault()
    const p = canvas.getScenePoint(e.nativeEvent)
    const active = canvas.getActiveObject()
    const activeObjects = canvas.getActiveObjects()
    const locked =
      activeObjects.length > 0
        ? activeObjects.some((o) => getAvnacLocked(o))
        : !!active && getAvnacLocked(active)
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sceneX: p.x,
      sceneY: p.y,
      hasSelection: !!active,
      locked,
    })
  }, [ready, vectorWorkspaceId])

  const openVectorBoardWorkspace = useCallback((id: string) => {
    setVectorWorkspaceId(id)
  }, [])

  const closeVectorWorkspace = useCallback(() => {
    setVectorWorkspaceId(null)
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (contextMenuRef.current?.contains(t)) return
      closeContextMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', closeContextMenu)
    window.addEventListener('scroll', closeContextMenu, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', closeContextMenu)
      window.removeEventListener('scroll', closeContextMenu, true)
    }
  }, [closeContextMenu, contextMenu])

  const deleteVectorBoard = useCallback(
    (boardId: string) => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (canvas && mod) {
        const toRemove: FabricObject[] = []
        for (const o of canvas.getObjects()) {
          if (!(o instanceof mod.Group)) continue
          const wid = (
            o as FabricObject & { avnacVectorBoardId?: string }
          ).avnacVectorBoardId
          if (wid === boardId) toRemove.push(o)
        }
        if (toRemove.length > 0) {
          const active = canvas.getActiveObject()
          if (active) {
            if (toRemove.includes(active)) {
              canvas.discardActiveObject()
            } else if (
              mod.ActiveSelection &&
              active instanceof mod.ActiveSelection
            ) {
              const inSel = active
                .getObjects()
                .some((o) => toRemove.includes(o))
              if (inSel) canvas.discardActiveObject()
            }
          }
          for (const o of toRemove) canvas.remove(o)
          canvas.requestRenderAll()
          setHasObjectSelected(!!canvas.getActiveObject())
          setCanvasBodySelected(!canvas.getActiveObject())
          selectionTick()
          syncTextToolbar()
          syncShapeToolbar()
        }
      }

      setVectorWorkspaceId((cur) => (cur === boardId ? null : cur))
      setVectorBoards((prev) => prev.filter((b) => b.id !== boardId))
      setVectorBoardDocs((prev) => {
        const next = { ...prev }
        delete next[boardId]
        vectorBoardDocsRef.current = next
        return next
      })
    },
    [syncShapeToolbar, syncTextToolbar],
  )

  const vectorWorkspaceName = useMemo(() => {
    if (!vectorWorkspaceId) return ''
    return (
      vectorBoards.find((b) => b.id === vectorWorkspaceId)?.name ??
      'Vector board'
    )
  }, [vectorBoards, vectorWorkspaceId])

  useEffect(() => {
    if (!ready) return

    if (!persistId) {
      if (!historyInitRef.current) {
        historyInitRef.current = true
        historySnapshotsRef.current = [captureDocRef.current()]
        historyIndexRef.current = 0
      }
      return
    }

    historyInitRef.current = false
    let cancelled = false

    void (async () => {
      const raw = await idbGetDocument(persistId)
      if (cancelled) return
      const doc = raw ? parseAvnacDocument(raw) : null
      applyingHistoryRef.current = true
      try {
        if (doc) {
          await applyDocRef.current(doc)
        } else if (
          initialArtboardWidth != null &&
          initialArtboardHeight != null &&
          Number.isFinite(initialArtboardWidth) &&
          Number.isFinite(initialArtboardHeight)
        ) {
          const W = Math.min(
            16000,
            Math.max(100, Math.round(initialArtboardWidth)),
          )
          const H = Math.min(
            16000,
            Math.max(100, Math.round(initialArtboardHeight)),
          )
          artboardWRef.current = W
          artboardHRef.current = H
          setArtboardSize({ w: W, h: H })
          setBgValue({ type: 'solid', color: '#ffffff' })
          const canvas = fabricCanvasRef.current
          const mod = fabricModRef.current
          if (canvas && mod) {
            canvas.discardActiveObject()
            const objs = canvas.getObjects().slice()
            for (const o of objs) canvas.remove(o)
            canvas.setDimensions({ width: W, height: H })
            const z = zoomPercentRef.current ?? 100
            const s = z / 100
            canvas.setDimensions(
              { width: W * s, height: H * s },
              { cssOnly: true },
            )
            canvas.backgroundColor = '#ffffff'
            removeSceneSnapRef.current?.()
            removeSceneSnapRef.current = installSceneSnap(canvas, {
              width: W,
              height: H,
              fabricMod: mod,
              guideColor: EDITOR_CANVAS_ACCENT,
            })
            canvas.calcOffset()
            canvas.requestRenderAll()
          }
          setHasObjectSelected(false)
          setCanvasBodySelected(true)
          selectionTick()
          syncTextToolbarRef.current()
          syncShapeToolbarRef.current()
          queueMicrotask(() => {
            if (!zoomUserAdjustedRef.current) fitArtboardToViewport()
          })
        }
      } finally {
        applyingHistoryRef.current = false
      }
      if (cancelled) return
      historySnapshotsRef.current = [captureDocRef.current()]
      historyIndexRef.current = 0
      historyInitRef.current = true
      scheduleIdbAutosave()
    })()

    return () => {
      cancelled = true
    }
  }, [
    ready,
    persistId,
    scheduleIdbAutosave,
    initialArtboardWidth,
    initialArtboardHeight,
    fitArtboardToViewport,
  ])

  useEffect(() => {
    setVectorWorkspaceId(null)
    setVectorBoardListReady(false)
    if (!persistId) {
      setVectorBoards([])
      setVectorBoardDocs({})
      setVectorBoardListReady(true)
      return
    }
    const boards = loadVectorBoards(persistId)
    const docs = loadVectorBoardDocs(persistId)
    const merged = mergeVectorBoardDocsForMeta(boards, docs)
    vectorBoardDocsRef.current = merged
    setVectorBoards(boards)
    setVectorBoardDocs(merged)
    setVectorBoardListReady(true)
  }, [persistId])

  useEffect(() => {
    if (!persistId || !vectorBoardListReady) return
    saveVectorBoards(persistId, vectorBoards)
  }, [persistId, vectorBoards, vectorBoardListReady])

  useEffect(() => {
    if (!persistId || !vectorBoardListReady) return
    saveVectorBoardDocs(persistId, vectorBoardDocs)
  }, [persistId, vectorBoardDocs, vectorBoardListReady])

  useEffect(() => {
    return () => {
      if (idbAutosaveTimerRef.current) {
        clearTimeout(idbAutosaveTimerRef.current)
        idbAutosaveTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !ready) return
    let textTimer: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (applyingHistoryRef.current) return
      commitHistory()
    }
    const onText = () => {
      if (applyingHistoryRef.current) return
      if (textTimer) clearTimeout(textTimer)
      textTimer = setTimeout(bump, 450)
    }
    canvas.on('object:modified', bump)
    canvas.on('object:added', bump)
    canvas.on('object:removed', bump)
    canvas.on('text:changed', onText)
    return () => {
      canvas.off('object:modified', bump)
      canvas.off('object:added', bump)
      canvas.off('object:removed', bump)
      canvas.off('text:changed', onText)
      if (textTimer) clearTimeout(textTimer)
    }
  }, [ready, commitHistory])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return
      const c = fabricCanvasRef.current
      const mod = fabricModRef.current
      const a = c?.getActiveObject()
      if (
        a &&
        mod?.IText &&
        a instanceof mod.IText &&
        a.isEditing
      ) {
        return
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (e.metaKey || e.ctrlKey) {
        if (
          !vectorWorkspaceId &&
          (e.key === 'c' || e.key === 'C')
        ) {
          e.preventDefault()
          void copyElementToClipboard()
          return
        }
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault()
          if (e.shiftKey) void redo()
          else void undo()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    ready,
    undo,
    redo,
    vectorWorkspaceId,
    copyElementToClipboard,
  ])

  useEffect(() => {
    if (!ready || vectorWorkspaceId) return
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable="true"]')) return
      const c = fabricCanvasRef.current
      const mod = fabricModRef.current
      const a = c?.getActiveObject()
      if (
        a &&
        mod?.IText &&
        a instanceof mod.IText &&
        a.isEditing
      ) {
        return
      }
      const atPoint = {
        x: artboardWRef.current / 2,
        y: artboardHRef.current / 2,
      }
      const files = imageFilesFromClipboardData(e.clipboardData)
      if (files.length > 0) {
        e.preventDefault()
        addImageFromFiles(files, atPoint)
        return
      }
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text) return
      e.preventDefault()
      void pasteAvnacClipText(text, atPoint)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addImageFromFiles, pasteAvnacClipText, ready, vectorWorkspaceId])

  const exportPng = useCallback((opts?: ExportPngOptions) => {
    void (async () => {
      const canvas = fabricCanvasRef.current
      const mod = fabricModRef.current
      if (!canvas || !mod) return
      setExportError(null)
      const mult = opts?.multiplier ?? 1
      const transparent = opts?.transparent ?? false
      const crop = opts?.crop ?? 'none'
      const aw = artboardWRef.current
      const ah = artboardHRef.current

      let left = 0
      let top = 0
      let width = aw
      let height = ah

      if (crop === 'selection') {
        const a = canvas.getActiveObject()
        if (a) {
          const br = a.getBoundingRect()
          left = br.left
          top = br.top
          width = Math.max(1, br.width)
          height = Math.max(1, br.height)
        }
      } else if (crop === 'content') {
        const objs = canvas.getObjects()
        if (objs.length) {
          let minX = Infinity
          let minY = Infinity
          let maxX = -Infinity
          let maxY = -Infinity
          for (const o of objs) {
            const br = o.getBoundingRect()
            minX = Math.min(minX, br.left)
            minY = Math.min(minY, br.top)
            maxX = Math.max(maxX, br.left + br.width)
            maxY = Math.max(maxY, br.top + br.height)
          }
          const pad = 32
          left = Math.max(0, minX - pad)
          top = Math.max(0, minY - pad)
          width = Math.max(1, Math.min(aw, maxX + pad) - left)
          height = Math.max(1, Math.min(ah, maxY + pad) - top)
        }
      }

      try {
        await normalizeCanvasImagesForExport(canvas, mod)
        const prevBg = canvas.backgroundColor
        try {
          if (transparent) {
            canvas.backgroundColor = 'transparent'
            canvas.requestRenderAll()
          }

          const data = canvas.toDataURL({
            format: 'png',
            multiplier: mult,
            left,
            top,
            width,
            height,
          })

          const a = document.createElement('a')
          a.href = data
          a.download =
            crop === 'none' ? 'avnac-design.png' : 'avnac-design-cropped.png'
          a.click()
        } finally {
          if (transparent) {
            canvas.backgroundColor = prevBg
            canvas.requestRenderAll()
          }
        }
      } catch (err) {
        console.error('FabricEditor: PNG export failed', err)
        setExportError(
          'Could not export this canvas. External images could not be prepared for download.',
        )
      }
    })()
  }, [])

  const saveDocument = useCallback(() => {
    const doc = captureDoc()
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json',
    })
    const u = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = u
    a.download = 'avnac-document.json'
    a.click()
    URL.revokeObjectURL(u)
  }, [captureDoc])

  const loadDocument = useCallback(
    async (file: File) => {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        return
      }
      const doc = parseAvnacDocument(parsed)
      if (!doc) return
      await applyDoc(doc)
      queueMicrotask(() => {
        zoomUserAdjustedRef.current = false
        fitArtboardToViewport()
        const next = captureDoc()
        historySnapshotsRef.current = [next]
        historyIndexRef.current = 0
        const pid = persistIdRef.current
        if (pid) {
          void idbPutDocument(pid, next, {
            name: persistDisplayNameRef.current,
          }).catch((err) => {
            console.error('FabricEditor: IndexedDB save after open failed', err)
          })
        }
      })
    },
    [applyDoc, captureDoc, fitArtboardToViewport],
  )

  const setBgValueRef = useRef(setBgValue)
  setBgValueRef.current = setBgValue

  const aiController = useMemo<AiDesignController>(() => {
    const describeKind = (obj: FabricObject): AiObjectKind => {
      const mod = fabricModRef.current
      if (!mod) return 'other'
      const anyObj = obj as FabricObject & {
        avnacVectorBoardId?: string
        avnacShape?: { kind?: string }
      }
      if (anyObj.avnacVectorBoardId) return 'vector-board'
      if (mod.FabricImage && obj instanceof mod.FabricImage) return 'image'
      if (mod.IText && obj instanceof mod.IText) return 'text'
      if (mod.Textbox && obj instanceof mod.Textbox) return 'text'
      if (mod.Line && obj instanceof mod.Line) return 'line'
      if (mod.Rect && obj instanceof mod.Rect) return 'rect'
      if (mod.Ellipse && obj instanceof mod.Ellipse) return 'ellipse'
      if (mod.Group && obj instanceof mod.Group) {
        if (anyObj.avnacShape?.kind === 'arrow') return 'arrow'
        return 'group'
      }
      const k = anyObj.avnacShape?.kind
      if (k === 'polygon') return 'polygon'
      if (k === 'star') return 'star'
      if (k === 'arrow') return 'arrow'
      if (k === 'line') return 'line'
      return 'other'
    }

    const findById = (id: string): FabricObject | null => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return null
      const objs = canvas.getObjects()
      for (const o of objs) {
        if ((o as FabricObject & { avnacLayerId?: string }).avnacLayerId === id)
          return o
      }
      return null
    }

    const fillAsString = (f: unknown): string | null => {
      if (typeof f === 'string') return f
      return null
    }

    const placeObject = (
      obj: FabricObject,
      spec: { x?: number; y?: number; origin?: 'center' | 'top-left' },
      fallbackCenter = false,
    ) => {
      const W = artboardWRef.current
      const H = artboardHRef.current
      const origin = spec.origin ?? (fallbackCenter ? 'center' : 'top-left')
      const ox = origin === 'center' ? 'center' : 'left'
      const oy = origin === 'center' ? 'center' : 'top'
      const x = typeof spec.x === 'number' ? spec.x : origin === 'center' ? W / 2 : 0
      const y = typeof spec.y === 'number' ? spec.y : origin === 'center' ? H / 2 : 0
      obj.set({
        originX: ox as 'left' | 'center' | 'right',
        originY: oy as 'top' | 'center' | 'bottom',
        left: x,
        top: y,
      })
    }

    return {
      getCanvas() {
        const canvas = fabricCanvasRef.current
        if (!canvas) return null
        const objects = canvas.getObjects()
        const summaries: AiObjectSummary[] = objects.map((o) => {
          const id =
            (o as FabricObject & { avnacLayerId?: string }).avnacLayerId ??
            ensureAvnacLayerId(o)
          const bb = o.getBoundingRect()
          const anyObj = o as FabricObject & { text?: string }
          return {
            id,
            kind: describeKind(o),
            label: o.type ?? 'object',
            left: Math.round(bb.left),
            top: Math.round(bb.top),
            width: Math.round(bb.width),
            height: Math.round(bb.height),
            angle: Math.round((o.angle ?? 0) * 10) / 10,
            fill: fillAsString(o.fill),
            stroke: fillAsString(o.stroke),
            text: typeof anyObj.text === 'string' ? anyObj.text : null,
          }
        })
        const bgColorVal = (canvas.backgroundColor as unknown) ?? null
        return {
          width: artboardWRef.current,
          height: artboardHRef.current,
          background: typeof bgColorVal === 'string' ? bgColorVal : null,
          objectCount: summaries.length,
          objects: summaries,
        }
      },
      addRectangle(spec) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod) return null
        const r = new mod.Rect({
          width: spec.width,
          height: spec.height,
          fill: spec.fill ?? '#262626',
          stroke: spec.stroke,
          strokeWidth: spec.strokeWidth ?? (spec.stroke ? 1 : 0),
          rx: spec.cornerRadius ?? 0,
          ry: spec.cornerRadius ?? 0,
          angle: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
        })
        setAvnacShapeMeta(r, { kind: 'rect' })
        placeObject(r, spec)
        const id = ensureAvnacLayerId(r)
        canvas.add(r)
        canvas.requestRenderAll()
        return { id }
      },
      addEllipse(spec) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod) return null
        const e = new mod.Ellipse({
          rx: spec.width / 2,
          ry: spec.height / 2,
          fill: spec.fill ?? '#262626',
          stroke: spec.stroke,
          strokeWidth: spec.strokeWidth ?? (spec.stroke ? 1 : 0),
          angle: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
        })
        setAvnacShapeMeta(e, { kind: 'ellipse' })
        placeObject(e, spec)
        const id = ensureAvnacLayerId(e)
        canvas.add(e)
        canvas.requestRenderAll()
        return { id }
      },
      addText(spec) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod) return null
        const Ctor = mod.Textbox ?? mod.IText
        if (!Ctor) return null
        const t = new Ctor(spec.text, {
          fontSize: spec.fontSize ?? 48,
          fontFamily: spec.fontFamily ?? 'Inter',
          fontWeight: spec.fontWeight ?? 'normal',
          fontStyle: spec.fontStyle ?? 'normal',
          fill: spec.fill ?? '#111111',
          textAlign: spec.textAlign ?? 'left',
          width: spec.width,
          angle: spec.rotation ?? 0,
          opacity: spec.opacity ?? 1,
        })
        placeObject(t, spec)
        const id = ensureAvnacLayerId(t)
        canvas.add(t)
        canvas.requestRenderAll()
        return { id }
      },
      addLine(spec) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod?.Line) return null
        const l = new mod.Line([spec.x1, spec.y1, spec.x2, spec.y2], {
          stroke: spec.stroke ?? '#111111',
          strokeWidth: spec.strokeWidth ?? 2,
          opacity: spec.opacity ?? 1,
        })
        const id = ensureAvnacLayerId(l)
        canvas.add(l)
        canvas.requestRenderAll()
        return { id }
      },
      async addImageFromUrl(spec) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod?.FabricImage) return null
        const rawUrl = spec.url.trim()
        let img: FabricImage
        try {
          img = await loadExportSafeFabricImage(mod, rawUrl)
        } catch {
          console.error('AI addImageFromUrl failed for URL', rawUrl.slice(0, 80))
          return null
        }
        try {
          const natW = img.width ?? 1
          const natH = img.height ?? 1
          const targetW = spec.width ?? natW
          const targetH = spec.height ?? natH
          img.set({
            scaleX: targetW / natW,
            scaleY: targetH / natH,
            angle: spec.rotation ?? 0,
            opacity: spec.opacity ?? 1,
          })
          placeObject(img as unknown as FabricObject, spec, true)
          const id = ensureAvnacLayerId(img as unknown as FabricObject)
          canvas.add(img)
          canvas.requestRenderAll()
          return { id }
        } catch (err) {
          console.error('AI addImageFromUrl failed', err)
          return null
        }
      },
      updateObject(id, patch) {
        const canvas = fabricCanvasRef.current
        if (!canvas) return false
        const obj = findById(id)
        if (!obj) return false
        const next: Record<string, unknown> = {}
        for (const key of [
          'left',
          'top',
          'width',
          'height',
          'scaleX',
          'scaleY',
          'angle',
          'fill',
          'stroke',
          'strokeWidth',
          'opacity',
        ] as const) {
          const v = patch[key]
          if (typeof v !== 'undefined') next[key] = v
        }
        obj.set(next as Partial<FabricObject>)
        if (typeof patch.text === 'string') {
          const anyObj = obj as FabricObject & { text?: string; set: FabricObject['set'] }
          anyObj.set({ text: patch.text } as Partial<FabricObject>)
        }
        if (typeof patch.fontSize === 'number') {
          obj.set({ fontSize: patch.fontSize } as Partial<FabricObject>)
        }
        obj.setCoords()
        canvas.fire('object:modified', { target: obj })
        canvas.requestRenderAll()
        return true
      },
      deleteObject(id) {
        const canvas = fabricCanvasRef.current
        if (!canvas) return false
        const obj = findById(id)
        if (!obj) return false
        canvas.remove(obj)
        canvas.requestRenderAll()
        return true
      },
      selectObjects(ids) {
        const canvas = fabricCanvasRef.current
        const mod = fabricModRef.current
        if (!canvas || !mod) return 0
        const targets = ids
          .map((id) => findById(id))
          .filter((o): o is FabricObject => Boolean(o))
        if (targets.length === 0) {
          canvas.discardActiveObject()
          canvas.requestRenderAll()
          return 0
        }
        if (targets.length === 1) {
          canvas.setActiveObject(targets[0])
        } else if (mod.ActiveSelection) {
          const sel = new mod.ActiveSelection(targets, { canvas })
          canvas.setActiveObject(sel)
        }
        canvas.requestRenderAll()
        return targets.length
      },
      setBackgroundColor(color) {
        setBgValueRef.current({ type: 'solid', color })
      },
      clearCanvas() {
        const canvas = fabricCanvasRef.current
        if (!canvas) return 0
        const objs = canvas.getObjects().slice()
        for (const o of objs) canvas.remove(o)
        canvas.requestRenderAll()
        return objs.length
      },
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({ exportPng, saveDocument, loadDocument }),
    [exportPng, saveDocument, loadDocument],
  )

  const onReadyChangeRef = useRef(onReadyChange)
  onReadyChangeRef.current = onReadyChange
  useEffect(() => {
    onReadyChangeRef.current?.(ready)
  }, [ready])

  const onBackgroundPicked = useCallback(
    (v: BgValue) => {
      setBgValue(v)
      queueMicrotask(() => {
        if (!applyingHistoryRef.current) commitHistory()
      })
    },
    [commitHistory],
  )

  const onArtboardResize = useCallback(
    (w: number, h: number) => {
      const W = Math.min(16000, Math.max(100, Math.round(w)))
      const H = Math.min(16000, Math.max(100, Math.round(h)))
      let changed = false
      setArtboardSize((prev) => {
        if (prev.w === W && prev.h === H) return prev
        changed = true
        return { w: W, h: H }
      })
      if (changed) {
        queueMicrotask(() => {
          if (!applyingHistoryRef.current) commitHistory()
        })
      }
    },
    [commitHistory],
  )

  const layerRows: EditorLayerRow[] = useMemo(() => {
    const c = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!c || !mod || editorSidebarPanel !== 'layers') return []
    void selectionRev
    const stack = c.getObjects()
    for (const o of stack) ensureAvnacLayerId(o)
    const objs = [...stack].reverse()
    const active = c.getActiveObject()
    return objs.map((o, uiIdx) => {
      const stackIndex = stack.length - 1 - uiIdx
      let selected = false
      if (
        active &&
        mod.ActiveSelection &&
        active instanceof mod.ActiveSelection
      ) {
        selected = active.getObjects().includes(o)
      } else if (active) {
        selected = active === o
      }
      return {
        id: ensureAvnacLayerId(o),
        index: stackIndex,
        label: fabricObjectLabel(o, mod),
        visible: o.visible !== false,
        selected,
      }
    })
  }, [editorSidebarPanel, selectionRev, ready])

  const onSelectLayer = useCallback((stackIndex: number) => {
    const c = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (!c || !mod) return
    const o = c.getObjects()[stackIndex]
    if (!o) return
    c.setActiveObject(o)
    c.requestRenderAll()
    selectionTick()
  }, [])

  const onToggleLayerVisible = useCallback((stackIndex: number) => {
    const c = fabricCanvasRef.current
    if (!c) return
    const o = c.getObjects()[stackIndex]
    if (!o) return
    o.set('visible', !o.visible)
    c.requestRenderAll()
    selectionTick()
    persistAfterMutation(c, o)
  }, [persistAfterMutation])

  const onLayerBringForward = useCallback((stackIndex: number) => {
    const c = fabricCanvasRef.current
    if (!c) return
    const o = c.getObjects()[stackIndex]
    if (!o) return
    c.bringObjectForward(o)
    c.requestRenderAll()
    selectionTick()
    persistAfterMutation(c, o)
  }, [persistAfterMutation])

  const onLayerSendBackward = useCallback((stackIndex: number) => {
    const c = fabricCanvasRef.current
    if (!c) return
    const o = c.getObjects()[stackIndex]
    if (!o) return
    c.sendObjectBackwards(o)
    c.requestRenderAll()
    selectionTick()
    persistAfterMutation(c, o)
  }, [persistAfterMutation])

  const onRenameLayer = useCallback(
    (stackIndex: number, name: string) => {
      const c = fabricCanvasRef.current
      if (!c) return
      const o = c.getObjects()[stackIndex]
      if (!o) return
      setAvnacLayerName(o, name)
      c.requestRenderAll()
      selectionTick()
      persistAfterMutation(c, o)
    },
    [persistAfterMutation],
  )

  const onLayerReorder = useCallback(
    (orderedLayerIds: string[]) => {
      const c = fabricCanvasRef.current
      if (!c) return
      const stack = c.getObjects()
      if (orderedLayerIds.length !== stack.length) return
      const byId = new Map<string, FabricObject>()
      for (const o of stack) {
        byId.set(ensureAvnacLayerId(o), o)
      }
      const topFirst: FabricObject[] = []
      for (const id of orderedLayerIds) {
        const o = byId.get(id)
        if (!o) return
        topFirst.push(o)
      }
      const targetStack = topFirst.slice().reverse()
      let moved: FabricObject | undefined
      for (let i = 0; i < targetStack.length; i++) {
        const want = targetStack[i]!
        const cur = c.getObjects()
        const curIdx = cur.indexOf(want)
        if (curIdx !== i) {
          c.moveObjectTo(want, i)
          moved = want
        }
      }
      if (!moved) return
      c.requestRenderAll()
      selectionTick()
      persistAfterMutation(c, moved)
    },
    [persistAfterMutation],
  )

  let elementToolbarLockedDisplay = false
  let elementToolbarCanGroup = false
  let elementToolbarCanAlignElements = false
  let elementToolbarCanUngroup = false
  let elementToolbarAlignAlready: Record<CanvasAlignKind, boolean> | null = null
  let selectionOutlineStrokeAllowed = false
  {
    const c = fabricCanvasRef.current
    const mod = fabricModRef.current
    if (c && mod) {
      const a = c.getActiveObject()
      if (a) {
        elementToolbarAlignAlready = artboardAlignAlreadySatisfied(
          a.getBoundingRect(),
          artboardW,
          artboardH,
        )
        if (mod.ActiveSelection && a instanceof mod.ActiveSelection) {
          const objs = a.getObjects()
          elementToolbarLockedDisplay =
            objs.length > 0 && objs.every((o) => getAvnacLocked(o))
          elementToolbarCanGroup =
            objs.length >= 2 &&
            !objs.some((o) => 'isEditing' in o && (o as IText).isEditing)
          elementToolbarCanAlignElements = elementToolbarCanGroup
        } else if (
          a instanceof mod.Group &&
          !(mod.ActiveSelection && a instanceof mod.ActiveSelection)
        ) {
          elementToolbarLockedDisplay = getAvnacLocked(a)
          elementToolbarCanUngroup = !isAvnacStrokeLineLike(
            getAvnacShapeMeta(a),
          )
        } else {
          elementToolbarLockedDisplay = getAvnacLocked(a)
        }
        selectionOutlineStrokeAllowed =
          collectOutlineStrokeTargets(a, mod, () => c.getActiveObjects())
            .length > 0
      }
    }
  }

  const selectionEffectsFooterSlot = hasObjectSelected ? (
    <>
      <BlurToolbarControl
        blurPct={selectionBlurPct}
        onChange={applyBlurToSelection}
      />
      <FloatingToolbarDivider />
      <TransparencyToolbarPopover
        opacityPct={selectionOpacityPct}
        onChange={applyOpacityToSelection}
      />
      {selectionOutlineStrokeAllowed ? (
        <>
          <FloatingToolbarDivider />
          <StrokeToolbarPopover
            strokeWidthPx={selectionOutlineStrokeWidth}
            strokePaint={selectionOutlineStrokePaint}
            onStrokeWidthChange={applyOutlineStrokeWidth}
            onStrokePaintChange={applyOutlineStrokePaint}
          />
        </>
      ) : null}
      <FloatingToolbarDivider />
      <ShadowToolbarPopover
        value={selectionShadowUi}
        shadowActive={selectionShadowActive}
        onChange={applyShadowToSelection}
      />
    </>
  ) : null

  const contextMenuButtonClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 outline-none hover:bg-black/[0.05] focus:bg-black/[0.05]'

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          addImageFromFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div
        ref={selectionToolsRef}
        className="pointer-events-auto relative z-30 flex h-14 w-full shrink-0 items-center justify-center px-1 sm:px-2"
      >
        {ready && textToolbarValues ? (
          <TextFormatToolbar
            values={textToolbarValues}
            onChange={onTextFormatChange}
            footerSlot={selectionEffectsFooterSlot}
          />
        ) : null}
        {ready && !textToolbarValues && shapeToolbarModel ? (
          <ShapeOptionsToolbar
            meta={shapeToolbarModel.meta}
            paintValue={shapeToolbarModel.paint}
            onPaintChange={applyPaintToSelection}
            onPolygonSides={applyPolygonSides}
            onStarPoints={applyStarPoints}
            onArrowLineStyle={applyArrowLineStyle}
            onArrowRoundedEnds={applyArrowRoundedEnds}
            onArrowStrokeWidth={applyArrowStrokeWidth}
            onArrowPathType={applyArrowPathType}
            rectCornerRadius={
              shapeToolbarModel.meta.kind === 'rect'
                ? shapeToolbarModel.rectCornerRadius
                : undefined
            }
            rectCornerRadiusMax={
              shapeToolbarModel.meta.kind === 'rect'
                ? shapeToolbarModel.rectCornerRadiusMax
                : undefined
            }
            onRectCornerRadius={
              shapeToolbarModel.meta.kind === 'rect'
                ? applyRectCornerRadius
                : undefined
            }
            footerSlot={selectionEffectsFooterSlot}
          />
        ) : null}
        {ready &&
        hasObjectSelected &&
        !textToolbarValues &&
        !shapeToolbarModel ? (
          <FloatingToolbarShell role="toolbar" aria-label="Selection">
            <div className="flex items-center py-1 pl-2 pr-2">
              {imageCornerToolbar ? (
                <>
                  <button
                    type="button"
                    disabled={elementToolbarLockedDisplay}
                    className={[
                      floatingToolbarIconButton(false),
                      elementToolbarLockedDisplay
                        ? 'pointer-events-none opacity-40'
                        : '',
                    ].join(' ')}
                    aria-label="Crop image"
                    title="Crop image"
                    onClick={openImageCropModal}
                  >
                    <HugeiconsIcon
                      icon={CropIcon}
                      size={20}
                      strokeWidth={1.75}
                    />
                  </button>
                  <CornerRadiusToolbarControl
                    value={imageCornerToolbar.radius}
                    max={imageCornerToolbar.max}
                    onChange={applyImageCornerRadius}
                    disabled={elementToolbarLockedDisplay}
                  />
                  <FloatingToolbarDivider />
                </>
              ) : null}
              {selectionEffectsFooterSlot}
            </div>
          </FloatingToolbarShell>
        ) : null}
        {ready &&
        !textToolbarValues &&
        !shapeToolbarModel &&
        canvasBodySelected ? (
          <div ref={backgroundPopoverAnchorRef} className="relative">
            <div className="theme-toolbar-shell flex items-center rounded-full border px-2 py-1 backdrop-blur-md">
              <ArtboardResizeToolbarControl
                width={artboardW}
                height={artboardH}
                onResize={onArtboardResize}
                viewportRef={viewportRef}
              />
              <FloatingToolbarDivider />
              <button
                type="button"
                className={backgroundTopBtn(false)}
                onClick={() => setBgPopoverOpen((o) => !o)}
                aria-label="Page background"
                aria-expanded={bgPopoverOpen}
                aria-haspopup="dialog"
                title="Background"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-md border border-[var(--border-strong)] shadow-inner"
                  style={bgValueToSwatch(bgValue)}
                />
                <span className="pr-0.5">Background</span>
              </button>
            </div>
            {bgPopoverOpen ? (
              <div
                ref={backgroundPopoverPanelRef}
                className={[
                  'absolute left-1/2 z-[60]',
                  backgroundPopoverOpenUpward
                    ? 'bottom-full mb-2'
                    : 'top-full mt-2',
                ].join(' ')}
                style={{
                  transform: `translateX(calc(-50% + ${backgroundPopoverShiftX}px))`,
                }}
              >
                <BackgroundPopover
                  value={bgValue}
                  onChange={(v) => onBackgroundPicked(v)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {exportError ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3">
          <div className="rounded-full border border-red-200 bg-red-50/95 px-4 py-2 text-sm text-red-700 shadow-[0_8px_24px_rgba(153,27,27,0.12)] backdrop-blur">
            {exportError}
          </div>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl bg-[var(--surface-subtle)]"
        onDragOver={ready ? onVectorBoardDragOver : undefined}
        onDrop={ready ? onViewportDrop : undefined}
        onContextMenu={ready ? onViewportContextMenu : undefined}
      >
        <div className="flex min-h-min w-full flex-1 flex-col items-center justify-center px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-1">
          <div
            ref={artboardClusterRef}
            className="relative z-0 -mt-4 inline-block sm:-mt-5"
          >
            {ready && hasObjectSelected && elementToolbarLayout ? (
              <CanvasElementToolbar
                ref={elementToolbarRef}
                style={{
                  left: elementToolbarLayout.left,
                  top: elementToolbarLayout.top,
                }}
                placement={elementToolbarLayout.placement}
                viewportRef={viewportRef}
                locked={elementToolbarLockedDisplay}
                onDuplicate={() => void duplicateElement()}
                onToggleLock={toggleElementLock}
                onDelete={deleteSelection}
                onCopy={() => void copyElementToClipboard()}
                onPaste={() => void pasteFromClipboard()}
                onAlign={alignElementToArtboard}
                alignAlreadySatisfied={
                  elementToolbarAlignAlready ?? {
                    left: false,
                    centerH: false,
                    right: false,
                    top: false,
                    centerV: false,
                    bottom: false,
                  }
                }
                canGroup={elementToolbarCanGroup}
                canAlignElements={elementToolbarCanAlignElements}
                canUngroup={elementToolbarCanUngroup}
                onGroup={groupSelection}
                onAlignElements={alignSelectedElements}
                onUngroup={ungroupSelection}
              />
            ) : null}
            <div
              ref={artboardFrameRef}
              className="relative rounded-sm"
              style={{
                lineHeight: 0,
                boxShadow:
                  artboardEmptyHovered && !hasObjectSelected
                    ? `var(--canvas-shell-shadow), 0 0 0 2px ${EDITOR_CANVAS_ACCENT}`
                    : 'var(--canvas-shell-shadow)',
              }}
            >
              <canvas ref={canvasElRef} className="block max-w-none" />
            </div>
          </div>
        </div>
      </div>

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          role="menu"
          className="fixed z-[90] min-w-48 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur"
          style={{
            left: `min(${contextMenu.x}px, calc(100vw - 12.5rem))`,
            top: `min(${contextMenu.y}px, calc(100vh - 18rem))`,
          }}
          data-avnac-chrome
        >
          {contextMenu.hasSelection ? (
            <>
              <button
                type="button"
                role="menuitem"
                className={contextMenuButtonClass}
                onClick={() => {
                  void copyElementToClipboard()
                  closeContextMenu()
                }}
              >
                <HugeiconsIcon
                  icon={Copy01Icon}
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-600"
                />
                Copy
              </button>
              <button
                type="button"
                role="menuitem"
                className={contextMenuButtonClass}
                onClick={() => {
                  void duplicateElement()
                  closeContextMenu()
                }}
              >
                <HugeiconsIcon
                  icon={Layers02Icon}
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-600"
                />
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                className={contextMenuButtonClass}
                onClick={() => {
                  toggleElementLock()
                  closeContextMenu()
                }}
              >
                <HugeiconsIcon
                  icon={
                    contextMenu.locked ? SquareUnlock01Icon : SquareLock01Icon
                  }
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-600"
                />
                {contextMenu.locked ? 'Unlock' : 'Lock'}
              </button>
              <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={contextMenuButtonClass}
            onClick={() => {
              void pasteFromClipboard({
                x: contextMenu.sceneX,
                y: contextMenu.sceneY,
              })
              closeContextMenu()
            }}
          >
            <HugeiconsIcon
              icon={FilePasteIcon}
              size={18}
              strokeWidth={1.75}
              className="shrink-0 text-neutral-600"
            />
            Paste
          </button>
          {contextMenu.hasSelection ? (
            <>
              <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
              <button
                type="button"
                role="menuitem"
                className={contextMenuButtonClass}
                onClick={() => {
                  deleteSelection()
                  closeContextMenu()
                }}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-neutral-600"
                />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div
        ref={canvasZoomRef}
        className="pointer-events-auto absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] right-3 z-30 sm:right-4"
      >
        {ready && zoomPercent !== null ? (
          <CanvasZoomSlider
            value={zoomPercent}
            min={ZOOM_MIN_PCT}
            max={ZOOM_MAX_PCT}
            onChange={onZoomSliderChange}
            onFitRequest={onZoomFitRequest}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-2 pt-24">
        <div
          ref={bottomToolbarRef}
          className="theme-toolbar-shell pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-1.5 backdrop-blur-xl"
          role="toolbar"
          aria-label="Editor tools"
        >
          <div
            ref={shapeToolSplitRef}
            className="theme-segmented relative flex items-stretch rounded-lg border"
          >
            <button
              type="button"
              disabled={!ready}
              className={`${toolbarIconBtn(!ready)} rounded-l-lg rounded-r-none border-0`}
              onClick={addQuickShape}
              aria-label={QUICK_SHAPE_TITLE[shapesQuickAddKind]}
              title={QUICK_SHAPE_TITLE[shapesQuickAddKind]}
            >
              <HugeiconsIcon
                icon={iconForShapesQuickAdd(shapesQuickAddKind)}
                size={20}
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              disabled={!ready}
              className={`${toolbarIconBtn(!ready)} rounded-l-none rounded-r-lg border-0 border-l border-[var(--line)]`}
              onClick={() => setShapesPopoverOpen((o) => !o)}
              aria-expanded={shapesPopoverOpen}
              aria-haspopup="menu"
              aria-label="More shapes"
              title="More shapes"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                strokeWidth={1.75}
              />
            </button>
            <ShapesPopover
              open={shapesPopoverOpen}
              disabled={!ready}
              anchorRef={shapeToolSplitRef}
              onClose={() => setShapesPopoverOpen(false)}
              onPick={(k) => {
                setShapesQuickAddKind(k)
                addShapeFromPopover(k)
                setShapesPopoverOpen(false)
              }}
            />
          </div>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={addText}
            aria-label="Add text"
            title="Add text"
          >
            <HugeiconsIcon icon={TextFontIcon} size={20} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={() => imageInputRef.current?.click()}
            aria-label="Add image"
            title="Add image"
          >
            <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            disabled={!ready}
            className={toolbarIconBtn(!ready)}
            onClick={() => setShortcutsOpen(true)}
            aria-label="Keyboard shortcuts"
            title="Shortcuts (?)"
          >
            <HugeiconsIcon icon={HelpCircleIcon} size={20} strokeWidth={1.75} />
          </button>

          {!ready ? (
            <span className="px-3 text-xs text-[var(--text-muted)]">
              Loading…
            </span>
          ) : null}
        </div>
      </div>

      {!ready ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-[var(--text-muted)]">
            Loading canvas…
          </span>
        </div>
      ) : null}
      {ready ? (
        <EditorFloatingSidebar
          activePanel={editorSidebarPanel}
          onSelectPanel={(id) =>
            setEditorSidebarPanel((p) => (p === id ? null : id))
          }
        />
      ) : null}
      <EditorLayersPanel
        open={ready && editorSidebarPanel === 'layers'}
        onClose={() => setEditorSidebarPanel(null)}
        rows={layerRows}
        onSelectLayer={onSelectLayer}
        onToggleVisible={onToggleLayerVisible}
        onBringForward={onLayerBringForward}
        onSendBackward={onLayerSendBackward}
        onReorder={onLayerReorder}
        onRenameLayer={onRenameLayer}
      />
      <EditorUploadsPanel
        open={ready && editorSidebarPanel === 'uploads'}
        onClose={() => setEditorSidebarPanel(null)}
      />
      <EditorImagesPanel
        open={ready && editorSidebarPanel === 'images'}
        onClose={() => setEditorSidebarPanel(null)}
        controller={aiController}
      />
      <EditorVectorBoardPanel
        open={ready && editorSidebarPanel === 'vector-board'}
        onClose={() => setEditorSidebarPanel(null)}
        boards={vectorBoards}
        boardDocs={vectorBoardDocs}
        onCreateNew={createVectorBoard}
        onOpenBoard={openVectorBoardWorkspace}
        onDeleteBoard={deleteVectorBoard}
      />
      <EditorAppsPanel
        open={ready && editorSidebarPanel === 'apps'}
        onClose={() => setEditorSidebarPanel(null)}
        controller={aiController}
      />
      <EditorAiPanel
        open={ready && editorSidebarPanel === 'ai'}
        onClose={() => setEditorSidebarPanel(null)}
        controller={aiController}
      />
      {vectorWorkspaceId ? (
        <VectorBoardWorkspace
          open
          boardName={vectorWorkspaceName}
          document={
            vectorBoardDocs[vectorWorkspaceId] ?? emptyVectorBoardDocument()
          }
          onDocumentChange={(doc) =>
            onVectorBoardDocumentChange(vectorWorkspaceId, doc)
          }
          onSave={closeVectorWorkspace}
          onSaveAndPlace={() => {
            placeActiveVectorBoardAtArtboardCenter()
            closeVectorWorkspace()
          }}
          onClose={closeVectorWorkspace}
        />
      ) : null}
      <EditorShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <ImageCropModal
        open={imageCropOpen}
        imageSrc={imageCropSrc}
        initialCrop={imageCropInitial}
        onCancel={cancelImageCrop}
        onApply={applyImageCropFromModal}
      />
      {ready && transformDimensionUi
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[10050] rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium leading-5 tabular-nums text-white shadow-md"
              style={{
                left: transformDimensionUi.left,
                top: transformDimensionUi.top,
              }}
              role="status"
              aria-live="polite"
            >
              {transformDimensionUi.text}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
},
)

export default FabricEditor
