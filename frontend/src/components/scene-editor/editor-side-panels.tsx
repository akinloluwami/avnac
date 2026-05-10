import { lazy, Suspense } from 'react'

import { emptyVectorBoardDocument } from '../../lib/avnac-vector-board-document'
import {
  editorSidebarPanelLeftClass,
  editorSidebarPanelTopClass,
} from '../../lib/editor-sidebar-panel-layout'
import EditorAppsPanel from '../editor-apps-panel'
import EditorFloatingSidebar, { type EditorSidebarPanelId } from '../editor-floating-sidebar'
import EditorImagesPanel from '../editor-images-panel'
import EditorLayersPanel from '../editor-layers-panel'
import EditorUploadsPanel from '../editor-uploads-panel'
import EditorVectorBoardPanel from '../editor-vector-board-panel'
import VectorBoardWorkspace from '../vector-board-workspace'
import { useEditorLayerControls } from './use-editor-layer-controls'
import { useVectorBoardControlsContext } from './use-vector-board-controls'

const EditorIconsPanel = lazy(() => import('../editor-icons-panel'))

function EditorIconsPanelLoading() {
  return (
    <div
      data-avnac-chrome
      className={[
        'pointer-events-auto fixed z-40 flex w-[min(100vw-1.5rem,360px)] max-h-[min(92dvh,720px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 backdrop-blur-md',
        editorSidebarPanelLeftClass,
        editorSidebarPanelTopClass,
      ].join(' ')}
      role="status"
    >
      <div className="border-b border-black/[0.06] px-3 py-2 text-sm font-semibold text-neutral-800">
        Icons
      </div>
      <div className="px-3 py-8 text-center text-sm text-neutral-500">Loading...</div>
    </div>
  )
}

export function EditorSidePanels({
  activePanel,
  onClosePanel,
  onSelectPanel,
  ready,
}: {
  activePanel: EditorSidebarPanelId | null
  onClosePanel: () => void
  onSelectPanel: (id: EditorSidebarPanelId) => void
  ready: boolean
}) {
  const {
    layerRows,
    onLayerBringForward,
    onLayerReorder,
    onLayerSendBackward,
    onRenameLayer,
    onSelectLayer,
    onToggleLayerVisible,
  } = useEditorLayerControls()
  const {
    boardDocs,
    boards,
    closeVectorWorkspace,
    createVectorBoard,
    deleteVectorBoard,
    onVectorBoardDocumentChange,
    openVectorBoardWorkspace,
    placeActiveVectorBoardAtArtboardCenter,
    vectorWorkspaceId,
    vectorWorkspaceName,
  } = useVectorBoardControlsContext()

  return (
    <>
      {ready ? (
        <EditorFloatingSidebar activePanel={activePanel} onSelectPanel={onSelectPanel} />
      ) : null}

      <EditorLayersPanel
        open={ready && activePanel === 'layers'}
        onClose={onClosePanel}
        rows={layerRows}
        onSelectLayer={onSelectLayer}
        onToggleVisible={onToggleLayerVisible}
        onBringForward={onLayerBringForward}
        onSendBackward={onLayerSendBackward}
        onReorder={onLayerReorder}
        onRenameLayer={onRenameLayer}
      />
      <EditorUploadsPanel open={ready && activePanel === 'uploads'} onClose={onClosePanel} />
      <EditorImagesPanel open={ready && activePanel === 'images'} onClose={onClosePanel} />
      {ready && activePanel === 'icons' ? (
        <Suspense fallback={<EditorIconsPanelLoading />}>
          <EditorIconsPanel open onClose={onClosePanel} />
        </Suspense>
      ) : null}
      <EditorVectorBoardPanel
        open={ready && activePanel === 'vector-board'}
        onClose={onClosePanel}
        boards={boards}
        boardDocs={boardDocs}
        onCreateNew={createVectorBoard}
        onOpenBoard={openVectorBoardWorkspace}
        onDeleteBoard={deleteVectorBoard}
      />
      <EditorAppsPanel open={ready && activePanel === 'apps'} onClose={onClosePanel} />
      {/* Magic is temporarily hidden while the hosted AI path is paused. */}
      {vectorWorkspaceId ? (
        <VectorBoardWorkspace
          open
          boardName={vectorWorkspaceName}
          document={boardDocs[vectorWorkspaceId] ?? emptyVectorBoardDocument()}
          onDocumentChange={next => onVectorBoardDocumentChange(vectorWorkspaceId, next)}
          onSave={closeVectorWorkspace}
          onSaveAndPlace={() => {
            placeActiveVectorBoardAtArtboardCenter()
            closeVectorWorkspace()
          }}
          onClose={closeVectorWorkspace}
        />
      ) : null}
    </>
  )
}
