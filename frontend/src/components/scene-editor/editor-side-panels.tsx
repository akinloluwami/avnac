import { emptyVectorBoardDocument } from '../../lib/avnac-vector-board-document'
import EditorAiPanel from '../editor-ai-panel'
import EditorAppsPanel from '../editor-apps-panel'
import EditorFloatingSidebar, { type EditorSidebarPanelId } from '../editor-floating-sidebar'
import EditorImagesPanel from '../editor-images-panel'
import EditorLayersPanel from '../editor-layers-panel'
import EditorUploadsPanel from '../editor-uploads-panel'
import EditorVectorBoardPanel from '../editor-vector-board-panel'
import VectorBoardWorkspace from '../vector-board-workspace'
import { useEditorLayerControls } from './use-editor-layer-controls'
import { useVectorBoardControlsContext } from './use-vector-board-controls'

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
      <EditorAiPanel open={ready && activePanel === 'ai'} onClose={onClosePanel} />
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
