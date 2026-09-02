Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$out = Join-Path $root "diagrams\CBS_LMS_Workflow.png"
$logoPath = Join-Path $root "front-end\public\cbs-logo-icon.png"

$width = 1342
$height = 768

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::FromArgb(246, 248, 251))

$navy = [System.Drawing.Color]::FromArgb(16, 35, 56)
$text = [System.Drawing.Color]::FromArgb(30, 45, 62)
$muted = [System.Drawing.Color]::FromArgb(51, 65, 85)
$blue = [System.Drawing.Color]::FromArgb(22, 119, 205)
$boxFill = [System.Drawing.Color]::FromArgb(232, 245, 255)
$highlightFill = [System.Drawing.Color]::FromArgb(255, 247, 237)
$highlightBorder = [System.Drawing.Color]::FromArgb(180, 83, 9)
$arrowColor = [System.Drawing.Color]::FromArgb(71, 85, 105)
$grayBorder = [System.Drawing.Color]::FromArgb(148, 163, 184)

$fontTitle = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
$fontSection = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
$fontBoxTitle = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
$fontBoxBody = New-Object System.Drawing.Font("Arial", 11, [System.Drawing.FontStyle]::Regular)
$fontSmall = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Regular)

$brushNavy = New-Object System.Drawing.SolidBrush($navy)
$brushText = New-Object System.Drawing.SolidBrush($text)
$brushMuted = New-Object System.Drawing.SolidBrush($muted)
$brushBox = New-Object System.Drawing.SolidBrush($boxFill)
$brushHighlight = New-Object System.Drawing.SolidBrush($highlightFill)
$brushWhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$penBlue = New-Object System.Drawing.Pen($blue, 2)
$penHighlight = New-Object System.Drawing.Pen($highlightBorder, 2)
$penArrow = New-Object System.Drawing.Pen($arrowColor, 2)
$penGray = New-Object System.Drawing.Pen($grayBorder, 1.4)
$penArrow.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(5, 5)

function New-RoundedRectPath {
    param([float]$x, [float]$y, [float]$w, [float]$h, [float]$r)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-RoundedBox {
    param([int]$x, [int]$y, [int]$w, [int]$h, [string]$title, [string[]]$lines, [bool]$highlight)
    $path = New-RoundedRectPath -x $x -y $y -w $w -h $h -r 13
    if ($highlight) {
        $g.FillPath($brushHighlight, $path)
        $g.DrawPath($penHighlight, $path)
    } else {
        $g.FillPath($brushBox, $path)
        $g.DrawPath($penBlue, $path)
    }

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $titleRect = New-Object System.Drawing.RectangleF(([float]($x + 6)), ([float]($y + 7)), ([float]($w - 12)), 43)
    $g.DrawString($title, $fontBoxTitle, $brushNavy, $titleRect, $format)

    $bodyText = [string]::Join("`n", $lines)
    $bodyRect = New-Object System.Drawing.RectangleF(([float]($x + 8)), ([float]($y + 49)), ([float]($w - 16)), ([float]($h - 53)))
    $g.DrawString($bodyText, $fontBoxBody, $brushMuted, $bodyRect, $format)
}

function Draw-PlainBox {
    param([int]$x, [int]$y, [int]$w, [int]$h, [string]$title, [string[]]$lines)
    $path = New-RoundedRectPath -x $x -y $y -w $w -h $h -r 12
    $g.FillPath($brushBox, $path)
    $g.DrawPath($penBlue, $path)

    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center

    $titleRect = New-Object System.Drawing.RectangleF(([float]($x + 6)), ([float]($y + 6)), ([float]($w - 12)), 43)
    $g.DrawString($title, $fontBoxTitle, $brushNavy, $titleRect, $format)
    $bodyRect = New-Object System.Drawing.RectangleF(([float]($x + 8)), ([float]($y + 47)), ([float]($w - 16)), ([float]($h - 50)))
    $g.DrawString(([string]::Join("`n", $lines)), $fontBoxBody, $brushMuted, $bodyRect, $format)
}

function Draw-Arrow {
    param([int]$x1, [int]$y1, [int]$x2, [int]$y2)
    $g.DrawLine($penArrow, $x1, $y1, $x2, $y2)
}

$g.DrawString("LMS Workflow", $fontTitle, $brushNavy, 55, 42)

if (Test-Path $logoPath) {
    try {
        $logo = [System.Drawing.Image]::FromFile($logoPath)
        $g.DrawImage($logo, 1180, 30, 92, 92)
        $logo.Dispose()
    } catch {
        $logoPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(64, 196, 238), 3)
        $g.DrawEllipse($logoPen, 1185, 35, 82, 82)
        $g.DrawString("CBS", (New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(64, 196, 238))), 1203, 65)
        $logoPen.Dispose()
    }
}

$g.DrawString("Main LMS Journey", $fontSection, $brushText, 65, 112)

$stepY = 146
$stepW = 160
$stepH = 86
$xs = @(51, 236, 421, 606, 792, 977)
Draw-RoundedBox -x $xs[0] -y $stepY -w $stepW -h $stepH -title "1. Login" -lines @("Access LMS") -highlight $false
Draw-RoundedBox -x $xs[1] -y $stepY -w $stepW -h $stepH -title "2. Publish`nCourse" -lines @("Instructor adds", "content") -highlight $true
Draw-RoundedBox -x $xs[2] -y $stepY -w $stepW -h $stepH -title "3. Enroll" -lines @("Learner joins", "course") -highlight $false
Draw-RoundedBox -x $xs[3] -y $stepY -w $stepW -h $stepH -title "4. Learn" -lines @("Complete", "modules") -highlight $false
Draw-RoundedBox -x $xs[4] -y $stepY -w $stepW -h $stepH -title "5. Assess" -lines @("Quiz is submitted") -highlight $false
Draw-RoundedBox -x $xs[5] -y $stepY -w $stepW -h $stepH -title "6. Complete" -lines @("Progress recorded") -highlight $false

for ($i = 0; $i -lt 5; $i++) {
    Draw-Arrow -x1 ($xs[$i] + $stepW) -y1 189 -x2 ($xs[$i + 1] - 5) -y2 189
}

Draw-PlainBox -x 792 -y 293 -w 160 -h 86 -title "7. Certificate" -lines @("PDF generated")
Draw-PlainBox -x 977 -y 293 -w 160 -h 86 -title "8. Report" -lines @("Results visible")
Draw-Arrow -x1 1057 -y1 232 -x2 1057 -y2 281
Draw-Arrow -x1 952 -y1 336 -x2 970 -y2 336

$g.DrawString("People Who Use The System", $fontSection, $brushText, 65, 432)
Draw-PlainBox -x 55 -y 459 -w 160 -h 86 -title "Learner" -lines @("Learn, assess, get", "certificates")
Draw-PlainBox -x 308 -y 459 -w 160 -h 86 -title "Instructor" -lines @("Create and", "publish training")
Draw-PlainBox -x 560 -y 459 -w 160 -h 86 -title "Sysadmin" -lines @("Manage users,", "roles, reports")

$g.DrawString("Database Tables Used By The System", $fontSection, $brushText, 65, 570)
Draw-PlainBox -x 55 -y 593 -w 234 -h 96 -title "Users & Roles" -lines @("users, profiles, user_roles")
Draw-PlainBox -x 308 -y 593 -w 194 -h 96 -title "Courses &`nModules" -lines @("courses,", "course_modules")
Draw-PlainBox -x 560 -y 593 -w 160 -h 96 -title "Learning`nRecords" -lines @("enrollments,", "results, history")
Draw-PlainBox -x 745 -y 589 -w 229 -h 100 -title "Certificates & Audit" -lines @("certifications, notifications,", "audit_logs")

$g.FillRectangle($brushWhite, 55, 696, 1172, 31)
$g.DrawRectangle($penGray, 55, 696, 1172, 31)
$g.DrawString("Plain reading: the LMS workflow is supported by database tables for users, courses, enrollments, assessments, certificates, notifications, and audit history.", $fontSmall, $brushText, 65, 703)

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

$penBlue.Dispose()
$penHighlight.Dispose()
$penArrow.Dispose()
$penGray.Dispose()
$brushNavy.Dispose()
$brushText.Dispose()
$brushMuted.Dispose()
$brushBox.Dispose()
$brushHighlight.Dispose()
$brushWhite.Dispose()
$fontTitle.Dispose()
$fontSection.Dispose()
$fontBoxTitle.Dispose()
$fontBoxBody.Dispose()
$fontSmall.Dispose()
$g.Dispose()
$bmp.Dispose()

Write-Output $out
