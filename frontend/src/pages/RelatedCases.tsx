import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactFlow, {
  MiniMap, Controls, Background,
  useNodesState, useEdgesState,
  MarkerType,
} from 'reactflow'
import type { Node, Edge, NodeProps } from 'reactflow'
import 'reactflow/dist/style.css'
import { useAppStore } from '../store/appStore'
import {
  Panel, StatusChip,
  SectionH1, AlertSuccess, AlertInfo, AlertError,
  MatchChip, EmptyState, PageShell
} from '../components/shared'

// Custom React Flow node
function ComplaintNode({ data }: NodeProps) {
  return (
    <div className={`panel border-2 p-3 min-w-[180px] shadow text-left ${data.isCurrent ? 'border-saffron' : 'border-navy'}`} style={{ borderRadius: '2px' }}>
      <div className="font-mono text-chip text-navy font-bold mb-1">{data.caseNumber}</div>
      <div className="text-chip text-ink font-semibold line-clamp-2">{data.title}</div>
      <div className="text-chip text-muted mt-1">{data.institution}</div>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        <StatusChip status={data.status} />
      </div>
    </div>
  )
}

const nodeTypes = { complaint: ComplaintNode }

export default function RelatedCasesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, complaints, relationships, reviewRelationship } = useAppStore()

  const complaint = complaints.find(c => c.id === id)
  const relatedRels = relationships.filter(r => r.sourceId === id || r.targetId === id)

  const [selectedRel, setSelectedRel] = useState<typeof relatedRels[0] | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Build graph nodes and edges
  const graphNodes: Node[] = []
  const graphEdges: Edge[] = []

  if (complaint) {
    graphNodes.push({
      id: complaint.id,
      type: 'complaint',
      position: { x: 300, y: 50 },
      data: { caseNumber: complaint.caseNumber, title: complaint.title, institution: complaint.institutionName, status: complaint.status, isCurrent: true },
    })

    relatedRels.forEach((rel, i) => {
      const otherId = rel.sourceId === id ? rel.targetId : rel.sourceId
      const otherCase = rel.sourceId === id ? rel.targetCaseNumber : rel.sourceCaseNumber
      const otherComplaint = complaints.find(c => c.id === otherId)
      const angle = (i / Math.max(relatedRels.length, 1)) * 2 * Math.PI
      const x = 300 + Math.cos(angle) * 280
      const y = 300 + Math.sin(angle) * 220

      graphNodes.push({
        id: otherId,
        type: 'complaint',
        position: { x, y },
        data: {
          caseNumber: otherCase,
          title: otherComplaint?.title ?? 'Case not found',
          institution: otherComplaint?.institutionName ?? '—',
          status: otherComplaint?.status ?? 'RECEIVED',
          isCurrent: false,
        },
      })

      const isConfirmed = rel.reviewStatus === 'CONFIRMED'
      const isDismissed = rel.reviewStatus === 'DISMISSED'
      graphEdges.push({
        id: rel.id,
        source: rel.sourceId === id ? (id ?? '') : otherId,
        target: rel.sourceId === id ? otherId : (id ?? ''),
        animated: !isConfirmed && !isDismissed,
        style: {
          stroke: isConfirmed ? '#0B6B2A' : isDismissed ? '#B3261E' : '#FF9933',
          strokeDasharray: isConfirmed || isDismissed ? undefined : '6 3',
          strokeWidth: 2,
        },
        label: `${rel.matchType.replace(/_/g,' ')} · ${(rel.similarityScore * 100).toFixed(0)}%`,
        labelStyle: { fontSize: '11px', fill: '#3B4659' },
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    })
  }

  const [nodes, , onNodesChange] = useNodesState(graphNodes)
  const [edges, , onEdgesChange] = useEdgesState(graphEdges)

  function handleNodeClick(_: any, node: Node) {
    if (node.id !== id) navigate(`/complaints/${node.id}`)
  }

  function handleEdgeClick(_: any, edge: Edge) {
    const rel = relationships.find(r => r.id === edge.id)
    if (rel) setSelectedRel(rel)
  }

  function handleDecision(decision: 'CONFIRMED' | 'DISMISSED' | 'FLAGGED') {
    if (!reason.trim()) { setReasonError('A reason is required before recording a relationship decision.'); return }
    if (!selectedRel) return
    reviewRelationship(selectedRel.id, decision, currentUser?.name ?? 'Officer', reason)
    setSuccessMsg(`Relationship ${decision.toLowerCase()}. Recorded in audit ledger.`)
    setSelectedRel(null)
    setReason('')
    setReasonError('')
  }

  if (!complaint) {
    return (
      <PageShell breadcrumb={[{ label: 'Complaints', path: '/complaints' }, { label: 'Not Found' }]}>
        <EmptyState icon="❌" title="Complaint not found" />
      </PageShell>
    )
  }

  return (
    <PageShell breadcrumb={[
      { label: 'Complaints', path: '/complaints' },
      { label: complaint.caseNumber, path: `/complaints/${id}` },
      { label: 'Related Cases' },
    ]}>
      <SectionH1>Related Cases · {complaint.caseNumber}</SectionH1>

      {successMsg && (
        <div className="mb-4">
          <AlertSuccess>{successMsg} <button onClick={() => navigate('/audit')} className="underline text-navy ml-2">View audit ledger →</button></AlertSuccess>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: Graph ── */}
        <div className="lg:col-span-2">
          <Panel title="Complaint Relationship Graph">
            <div className="p-2">
              <div className="mb-2 flex items-center gap-4 text-chip text-muted px-2">
                <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-status-green"></span> Confirmed</span>
                <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-saffron" style={{ borderTop: '2px dashed #FF9933' }}></span> AI Suggested</span>
                <span className="flex items-center gap-1"><span className="inline-block w-6 h-0.5 bg-status-red"></span> Dismissed</span>
                <span className="ml-auto chip chip-under-review border-saffron">★ Current case</span>
              </div>
            </div>
            {relatedRels.length === 0 ? (
              <div className="p-8">
                <EmptyState icon="🔗" title="No related cases found" subtitle="No relationship suggestions exist for this case. Run case analysis to detect potentially related complaints." />
                <div className="flex justify-center mt-4">
                  <button className="btn-primary">Run Case Analysis</button>
                </div>
              </div>
            ) : (
              <div style={{ height: 480, width: '100%' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  nodeTypes={nodeTypes}
                  fitView
                >
                  <MiniMap />
                  <Controls />
                  <Background gap={16} color="#C3CCDC" />
                </ReactFlow>
              </div>
            )}
            <div className="px-4 py-2 border-t border-border bg-tint">
              <div className="text-chip text-muted">
                Click a <strong>node</strong> to view that complaint · Click an <strong>edge</strong> to review the relationship · <span className="font-semibold text-navy">{complaint.caseNumber}</span> highlighted with saffron border
              </div>
              {relatedRels.length > 0 && (
                <div className="mt-2">
                  <p className="text-chip text-muted font-semibold">Near-miss candidates (below review threshold):</p>
                  <p className="text-chip text-muted">Cases with similarity score &lt; 0.60 were evaluated but not flagged. They are available for manual review through the complaints queue.</p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── RIGHT: Three panels ── */}
        <div className="space-y-6">

          {/* Panel A: Match explanation */}
          {selectedRel ? (
            <>
              <Panel title="A. Match Explanation">
                <div className="p-4 space-y-3">
                  <div className="text-center">
                    <div className="text-4xl font-bold font-mono text-navy">{(selectedRel.similarityScore * 100).toFixed(0)}%</div>
                    <div className="text-chip text-muted">Similarity Score</div>
                    <div className="w-full bg-border h-3 mt-2" style={{ borderRadius: '2px' }}>
                      <div
                        className="h-3 bg-navy relative"
                        style={{ width: `${selectedRel.similarityScore * 100}%`, borderRadius: '2px' }}
                      >
                        <div
                          className="absolute top-0 h-3 w-0.5 bg-saffron"
                          style={{ left: '75%' }}
                          title="Review threshold: 75%"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-chip text-muted mt-1">
                      <span>0%</span>
                      <span>▲ 75% threshold</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div>
                    <MatchChip type={selectedRel.matchType} />
                    <div className="text-chip text-muted mt-2">{selectedRel.explanation}</div>
                  </div>
                  <div className="alert-warning">
                    <span>◔</span>
                    <span className="text-chip">A similarity score indicates textual or structural overlap. It is <strong>not</strong> proof that complaints are duplicates or that allegations are factually identical.</span>
                  </div>
                </div>
              </Panel>

              {/* Panel B: Evidence comparison */}
              <Panel title="B. Field Comparison">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>{complaint.caseNumber}</th>
                        <th>{selectedRel.sourceId === id ? selectedRel.targetCaseNumber : selectedRel.sourceCaseNumber}</th>
                        <th>Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const other = complaints.find(c => c.id === (selectedRel.sourceId === id ? selectedRel.targetId : selectedRel.sourceId))
                        return [
                          ['Institution', complaint.institutionName, other?.institutionName ?? '—', complaint.institutionId === other?.institutionId ? 'SAME' : 'DIFFERENT'],
                          ['Category', complaint.category, other?.category ?? '—', complaint.category === other?.category ? 'SAME' : 'DIFFERENT'],
                          ['Priority', complaint.priority, other?.priority ?? '—', 'INFO'],
                          ['Status', complaint.status, other?.status ?? '—', 'INFO'],
                          ['Bureau', complaint.assignedBureauName, other?.assignedBureauName ?? '—', complaint.assignedBureauId === other?.assignedBureauId ? 'SAME' : 'DIFFERENT'],
                        ].map(([field, a, b, signal]) => (
                          <tr key={field as string}>
                            <td className="font-semibold text-muted">{field}</td>
                            <td className="text-table">{a}</td>
                            <td className="text-table">{b}</td>
                            <td>
                              <span className={`chip ${signal === 'SAME' ? 'chip-resolved' : signal === 'DIFFERENT' ? 'chip-action-req' : 'chip-triage'}`}>
                                {signal}
                              </span>
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Panel C: Officer decision */}
              <Panel title="C. Officer Relationship Decision">
                <div className="p-4 space-y-3">
                  {selectedRel.reviewStatus !== 'PENDING' ? (
                    <div>
                      <div className="alert-info mb-3">
                        <span>ℹ</span>
                        <span>This relationship has already been reviewed.</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-chip">
                        <div><span className="text-muted">Decision:</span> <strong>{selectedRel.reviewStatus}</strong></div>
                        <div><span className="text-muted">By:</span> {selectedRel.reviewedBy}</div>
                      </div>
                      <div className="text-chip text-muted mt-2">Reason: {selectedRel.reviewReason}</div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="rel-reason" className="form-label">Reason for decision * (required)</label>
                        <textarea
                          id="rel-reason"
                          className="form-textarea"
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Provide your reasoning. This will be recorded in the audit ledger and cannot be edited."
                          rows={4}
                        />
                        {reasonError && (
                          <div className="mt-2">
                            <AlertError>{reasonError}</AlertError>
                          </div>
                        )}
                      </div>
                      <div className="alert-info">
                        <span>ℹ</span>
                        <span className="text-chip">Confirming a relationship creates a relationship record only. It does <strong>not</strong> merge complaints, delete records, or automatically change complaint statuses.</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleDecision('CONFIRMED')} className="btn-primary justify-center">
                          ✓ Confirm Relationship
                        </button>
                        <button onClick={() => handleDecision('DISMISSED')} className="btn-secondary justify-center border-status-red text-status-red">
                          ✗ Dismiss Suggestion
                        </button>
                        <button onClick={() => handleDecision('FLAGGED')} className="btn-secondary justify-center">
                          ◆ Mark for Further Review
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </Panel>
            </>
          ) : (
            <Panel title="Relationship Review">
              <div className="p-4">
                <AlertInfo>
                  Click an edge (connection line) in the graph to review that relationship, or select from the list below.
                </AlertInfo>
                {relatedRels.length === 0 ? (
                  <p className="text-chip text-muted mt-3">No relationships to review.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {relatedRels.map(rel => {
                      const otherCN = rel.sourceId === id ? rel.targetCaseNumber : rel.sourceCaseNumber
                      return (
                        <button
                          key={rel.id}
                          onClick={() => setSelectedRel(rel)}
                          className="w-full text-left p-2 border border-border hover:border-navy hover:bg-tint transition-colors"
                          style={{ borderRadius: '2px' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-mono text-navy">{otherCN}</span>
                            <MatchChip type={rel.matchType} />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-chip text-muted">{(rel.similarityScore * 100).toFixed(0)}% match</span>
                            <span className={`chip ${rel.reviewStatus === 'CONFIRMED' ? 'chip-resolved' : rel.reviewStatus === 'DISMISSED' ? 'chip-sla-breached' : 'chip-action-req'}`}>
                              {rel.reviewStatus}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  )
}
