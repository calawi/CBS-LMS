$frontendPositionPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\frontend\src\pages\admin\PositionRequests.tsx'
$frontendApplicationsPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\frontend\src\pages\admin\Applications.tsx'
$backendApiPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\backend\src\routes\api.ts'

$pos = Get-Content -Raw -Path $frontendPositionPath

$pos = $pos -replace "import \{ CheckCircle2Icon, XCircleIcon, ArrowLeftIcon, PlusIcon \} from 'lucide-react'",
  "import { CheckCircle2Icon, XCircleIcon, ArrowLeftIcon, PlusIcon, ClipboardListIcon, FileTextIcon, SendIcon } from 'lucide-react'"

$pos = $pos -replace "(?m)^interface PositionRequestsResponse \{\r?\n  requests: PositionRequest\[\]\r?\n  role: string\r?\n\}\r?\n",
@'
interface PositionRequestsResponse {
  requests: PositionRequest[]
  role: string
}

type RequestSection = 'requisition' | 'tor' | 'publish'

const sectionForStatus = (status: string): RequestSection =>
  status === 'pending_post' || status === 'posted' ? 'publish' : status === 'pending_hr_tor' ? 'tor' : 'requisition'

const dutyStationFromRequest = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.toUpperCase() === 'HQ') return 'Mogadishu-HQ'
  return text
}

'@

$pos = $pos -replace "  const \[feedback, setFeedback\] = useState<\{ type: 'success' \| 'error'; message: string \} \| null>\(null\)\r?\n",
@'
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [activeSection, setActiveSection] = useState<RequestSection>('requisition')
'@

$pos = $pos -replace "  const isGeneralManager = String\(staff\?\.user_role \|\| ''\)\.toLowerCase\(\) === 'general_manager'\r?\n",
@'
  const isGeneralManager = String(staff?.user_role || '').toLowerCase() === 'general_manager'

  useEffect(() => {
    if (!data) return
    setActiveSection(sectionForStatus(String(data.request.workflow_status || '')))
  }, [data?.request.workflow_status])
'@

$pos = $pos -replace "      duty_station: String\(data\.tor\?\.duty_station \|\| data\.request\.location \|\| ''\)\.trim\(\),",
  "      duty_station: String(data.tor?.duty_station || dutyStationFromRequest(nm.location || data.request.location) || '').trim(),"
$pos = $pos -replace "      employment_status: String\(data\.tor\?\.employment_status \|\| ''\)\.trim\(\),",
  "      employment_status: String(data.tor?.employment_status || 'Permanent').trim(),"
$pos = $pos -replace "      appointment_period: String\(data\.tor\?\.appointment_period \|\| ''\)\.trim\(\),",
  "      appointment_period: String(data.tor?.appointment_period || 'Full-time').trim(),"
$pos = $pos -replace "      role_summary: String\(data\.tor\?\.role_summary \|\| ''\)\.trim\(\),",
  "      role_summary: String(data.tor?.role_summary || nm.position_type || nm.justification || '').trim(),"
$pos = $pos -replace "      general_description: String\(data\.tor\?\.general_description \|\| ''\)\.trim\(\),",
  "      general_description: String(data.tor?.general_description || nm.new_position_justification || nm.replacement_justification || '').trim(),"
$pos = $pos -replace "      duties_responsibilities: String\(data\.tor\?\.duties_responsibilities \|\| ''\)\.trim\(\),",
  "      duties_responsibilities: String(data.tor?.duties_responsibilities || nm.duties || data.request.duties || '').trim(),"
$pos = $pos -replace "      how_to_apply: String\(data\.tor\?\.how_to_apply \|\| ''\)\.trim\(\),",
  "      how_to_apply: String(data.tor?.how_to_apply || 'Applications must be submitted through the CBS iRecruitment portal before the stated deadline.').trim(),"

$stepNav = @'
      {data && (
        <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { key: 'requisition' as const, title: '1. Requisition', desc: 'Approved staffing request', icon: ClipboardListIcon },
            { key: 'tor' as const, title: '2. TOR', desc: 'Director upload and HR TOR', icon: FileTextIcon },
            { key: 'publish' as const, title: '3. Publish', desc: 'Deadline and vacancy posting', icon: SendIcon },
          ].map((step) => {
            const Icon = step.icon
            const active = activeSection === step.key
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setActiveSection(step.key)}
                className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                  active ? 'border-cbs-cyan bg-cbs-cyan/10 text-cbs-navy' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="w-4 h-4" />
                  {step.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">{step.desc}</div>
              </button>
            )
          })}
        </div>
      )}

'@
$pos = $pos -replace "      \{data && \(\r?\n        <div className=`"grid grid-cols-1 lg:grid-cols-3 gap-6`">", "$stepNav      {data && (`r`n        <div className=`"grid grid-cols-1 lg:grid-cols-3 gap-6`">"

$pos = $pos -replace "\{Boolean\(String\(data\.request\.director_tor_stored_name \|\| ''\)\.trim\(\)\) && \(",
  "{activeSection === 'tor' && Boolean(String(data.request.director_tor_stored_name || '').trim()) && ("
$pos = $pos -replace "<Card title=`"Position details`">", "{activeSection === 'requisition' && (`r`n            <Card title=`"Requisition details`">"
$pos = $pos -replace "</Card>\r?\n\r?\n            \{displayValue\(requestNotes\.justification, data\.request\.justification\) !== '.*?' && \(",
  "</Card>`r`n            )}`r`n`r`n            {activeSection === 'requisition' && displayValue(requestNotes.justification, data.request.justification) !== '—' && ("
$pos = $pos -replace "\{displayValue\(requestNotes\.new_position_justification\) !== '.*?' && \(",
  "{activeSection === 'requisition' && displayValue(requestNotes.new_position_justification) !== '—' && ("
$pos = $pos -replace "\{displayValue\(requestNotes\.replacement_justification, data\.request\.replacement_justification\) !== '.*?' && \(",
  "{activeSection === 'requisition' && displayValue(requestNotes.replacement_justification, data.request.replacement_justification) !== '—' && ("
$pos = $pos -replace "\{displayValue\(requestNotes\.duties, data\.request\.duties\) !== '.*?' && \(",
  "{activeSection === 'requisition' && displayValue(requestNotes.duties, data.request.duties) !== '—' && ("
$pos = $pos -replace "\{showTorSummary && \(", "{(activeSection === 'tor' || activeSection === 'publish') && showTorSummary && ("
$pos = $pos -replace "\{showTorHrPanel && \(", "{activeSection === 'tor' && showTorHrPanel && ("
$pos = $pos -replace "\{showPublishPanel && \(", "{activeSection === 'publish' && showPublishPanel && ("

$pos = $pos -replace "              <Card title=`"HR: complete TOR`">\r?\n                \{Boolean\(String\(data\.request\.director_tor_stored_name \|\| ''\)\.trim\(\)\) && \(\r?\n                  <p className=`"text-xs text-slate-600 mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2`">\r?\n                    Download the director.*?\r?\n                  </p>\r?\n                \)\}\r?\n                <p className=`"text-xs text-slate-500 mb-4`">Complete the TOR form below, then save and post when ready\.</p>",
@'
              <Card title="HR: complete TOR">
                <p className="text-xs text-slate-500 mb-4">
                  The TOR form below is prefilled from the approved requisition. Review the director upload, complete any remaining blanks, then save to move this request to Publish.
                </p>
'@

$pos = $pos -replace "              <Card title=`"Publish vacancy`">\r?\n                <p className=`"text-xs text-slate-500 mb-3`">\r?\n                  Posting requires completed Governor approval path and TOR\. Set the deadline and choose whether this vacancy is internal or external\.\r?\n                </p>",
@'
              <Card title="Publish vacancy">
                <p className="text-xs text-slate-500 mb-3">
                  The approved requisition and saved TOR are already linked to this posting. Set the deadline, choose Internal or External, then post.
                </p>
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Ready data: title, department, duty station, reporting line, duties, TOR snapshot, and screening fields are carried into the vacancy automatically.
                </div>
'@

$pos = $pos -replace "                  <Button variant=`"primary`" loading=\{publishing\} onClick=\{publishJob\}>\r?\n                    Post vacancy\r?\n                  </Button>",
@'
                  <Button variant="primary" loading={publishing} onClick={publishJob}>
                    Post vacancy
                  </Button>
                  {recruitmentType === 'INTERNAL' && (
                    <a
                      href="/api/internal/application-form/download"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-[38px] items-center rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-cbs-navy hover:bg-slate-50"
                    >
                      Download internal application form
                    </a>
                  )}
'@

Set-Content -Path $frontendPositionPath -Value $pos -NoNewline

$apps = Get-Content -Raw -Path $frontendApplicationsPath
$apps = $apps -replace "<Info label=`"Certified copies document`" value=\{app\?\.internal_certified_qualifications_document_id \? `Document #\$\{app\.internal_certified_qualifications_document_id\}` : '.*?'\} />",
  "<Info label=`"Certified copies document`" value={app?.internal_certified_qualifications_document_id ? `Document #`${app.internal_certified_qualifications_document_id}` : '—'} />"
$downloadBlock = @'
                {app?.internal_certified_qualifications_document_id && (
                  <div className="mt-4">
                    <a
                      href={`/api/candidate/documents/${app.internal_certified_qualifications_document_id}/admin-download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-cbs-cyan hover:bg-cbs-cyanHover text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
                    >
                      <DownloadIcon className="w-4 h-4" /> Download internal form attachment
                    </a>
                  </div>
                )}
'@
$apps = $apps -replace "                \{app\?\.internal_qualifications_experience && \(", "$downloadBlock                {app?.internal_qualifications_experience && ("
Set-Content -Path $frontendApplicationsPath -Value $apps -NoNewline

$api = Get-Content -Raw -Path $backendApiPath
$internalRoute = @'

router.get('/internal/application-form/download', requireAuth, requireRole(['admin', 'hr', 'hr_director']), async (_req, res) => {
  try {
    await fs.access(internalApplicationFormPath)
    res.download(internalApplicationFormPath, 'Application Form For CBS Internal Positions.docx')
  } catch {
    res.status(404).json({ error: 'internal_application_form_not_found' })
  }
})
'@
$api = $api -replace "router.get\('/candidate/documents/:id/download', requireCandidateAuth, async \(req, res\) => \{", "$internalRoute`r`nrouter.get('/candidate/documents/:id/download', requireCandidateAuth, async (req, res) => {"

$adminDocRoute = @'

router.get('/candidate/documents/:id/admin-download', requireAuth, requireRole(['admin', 'hr', 'hr_director', 'hiring_committee', ...seniorRoles]), async (req, res) => {
  await ensureCandidateDocsTable()
  const docId = Number(req.params.id)
  const [rows] = await pool.query<{ candidate_id: number; stored_name: string; original_name: string }[]>(
    'SELECT candidate_id, stored_name, original_name FROM candidate_documents WHERE id = ? LIMIT 1',
    [docId],
  )
  if (!rows.length) return res.status(404).json({ error: 'not_found' })
  const stored = rows[0]
  const filePath = path.join(candidateDocsRoot, String(stored.candidate_id), stored.stored_name)
  res.download(filePath, stored.original_name || stored.stored_name)
})
'@
$api = $api -replace "router.get\('/candidate/offers', requireCandidateAuth, async \(req, res\) => \{", "$adminDocRoute`r`nrouter.get('/candidate/offers', requireCandidateAuth, async (req, res) => {"
Set-Content -Path $backendApiPath -Value $api -NoNewline

Write-Output 'Updated iRecruitment workflow pages and downloads.'
