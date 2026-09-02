$formPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\frontend\src\pages\admin\PositionRequestForm.tsx'
$detailPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\frontend\src\pages\admin\PositionRequests.tsx'
$apiPath = 'C:\Users\abdirahman.hanafi\Desktop\Irecruitment-system\backend\src\routes\api.ts'

$form = Get-Content -Raw -Path $formPath

$form = $form -replace "(?m)^  gender: string\r?\n", ""
$form = $form -replace "(?m)^  gender: '',\r?\n", ""
$form = $form -replace "(?m)^      if \(!form\.gender\.trim\(\)\) return 'Gender \(preference\) is required.*\r?\n", ""
$form = $form -replace "(?m)^          gender: form\.gender \|\| undefined,\r?\n", ""
$form = $form -replace "(?m)^    \{ label: 'Gender preference', value: form\.gender \|\| '.*' \},\r?\n", ""
$form = $form -replace "(?m)^            description=`"Gender field is required before submission \(per HR policy\)\.`"\r?\n", ""

$genderFieldPattern = @'
(?s)\s{12}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">\r?\n\s{14}<SelectField label="Gender preference" required value=\{form\.gender\} onChange=\{\(e\) => setForm\(\{ \.\.\.form, gender: e\.target\.value \}\)\}>\r?\n\s{16}<option value="">Select.*?</option>\r?\n\s{16}<option value="any">No preference</option>\r?\n\s{16}<option value="female">Female</option>\r?\n\s{16}<option value="male">Male</option>\r?\n\s{14}</SelectField>\r?\n\s{14}<div className="md:col-span-2">\r?\n\s{16}<TextField\r?\n\s{18}label="Position classification / notes \(optional\)"\r?\n\s{18}value=\{form\.position_type\}\r?\n\s{18}onChange=\{\(e\) => setForm\(\{ \.\.\.form, position_type: e\.target\.value \}\)\}\r?\n\s{16}/>\r?\n\s{14}</div>\r?\n\s{12}</div>
'@

$replacement = @'
            <div className="mt-6">
              <TextField
                label="Position classification / notes (optional)"
                value={form.position_type}
                onChange={(e) => setForm({ ...form, position_type: e.target.value })}
              />
            </div>
'@

$form = [regex]::Replace($form, $genderFieldPattern, $replacement)
Set-Content -Path $formPath -Value $form -NoNewline

$detail = Get-Content -Raw -Path $detailPath
$detail = $detail -replace "(?m)^                <Info label=`"Gender preference`" value=\{displayValue\(requestNotes\.gender, data\.request\.gender\)\} />\r?\n", ""
Set-Content -Path $detailPath -Value $detail -NoNewline

Write-Output "Removed Gender preference from:"
Write-Output $formPath
Write-Output $detailPath

$api = Get-Content -Raw -Path $apiPath
$api = $api -replace "(?m)^  const gender = String\(notesPayload\?\.gender \|\| body\.gender \|\| ''\)\.trim\(\)\r?\n", ""
$api = $api -replace "(?m)^    !gender \|\|\r?\n", ""
$api = $api -replace "(?m)^    \['gender', gender \|\| null\],\r?\n", ""
Set-Content -Path $apiPath -Value $api -NoNewline
Write-Output $apiPath
