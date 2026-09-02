from __future__ import annotations

import html
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "presentations" / "CBS_LMS_Presentation.pptx"
LOGO = ROOT / "front-end" / "public" / "cbs-logo-icon.png"
DFD = ROOT / "diagrams" / "DFD_Level1@2x.png"

SLIDE_W = 13_333_333
SLIDE_H = 7_500_000


slides = [
    {
        "title": "CBS LMS - Business Process Overview",
        "subtitle": "A clear director-level view of how staff learning moves from course setup to certification.",
        "bullets": [
            "Three roles: Learner, Instructor, Sysadmin",
            "Covers course delivery, progress tracking, assessments, certificates, reports, and audit records",
        ],
        "kind": "title",
    },
    {
        "title": "LMS Workflow",
        "kind": "workflow",
    },
    {
        "title": "People Who Use The System",
        "columns": [
            ("Learner", ["Browse courses", "Enroll in training", "Complete modules", "Take assessments", "Download certificates"]),
            ("Instructor", ["Create courses", "Add modules and assessments", "Publish training", "Track learner progress"]),
            ("Sysadmin", ["Manage users and roles", "Configure LMS settings", "Review reports and audit logs", "Maintain system data"]),
        ],
    },
    {
        "title": "What The LMS Does",
        "bullets": [
            "Stores all courses, modules, assessments, enrollments, results, certificates, and training history",
            "Guides learners from course enrollment to assessment completion",
            "Automatically records progress and completion status",
            "Issues PDF certificates after successful course assessment",
            "Provides reporting, notifications, announcements, leaderboard, and audit visibility",
        ],
    },
    {
        "title": "Database Tables Used By The System",
        "columns": [
            ("Identity", ["users", "profiles", "user_roles", "departments"]),
            ("Content", ["courses", "course_modules", "assessments", "assessment_questions"]),
            ("Activity", ["enrollments", "assessment_results", "training_assignments", "training_history"]),
            ("Operations", ["certifications", "notifications", "announcements", "approval_requests", "audit_logs"]),
        ],
    },
    {
        "title": "Controls, Technology, and Next Steps",
        "columns": [
            ("Security", ["JWT authentication", "Role-based access", "MFA-ready user model", "Audit logs"]),
            ("Technology", ["React + TypeScript", "Node.js + Express", "MySQL", "PDF certificates"]),
            ("Next Steps", ["Confirm final workflow", "Test all 3 roles", "Verify reports", "Prepare demo data"]),
        ],
    },
]


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def box(
    shape_id: int,
    x: int,
    y: int,
    cx: int,
    cy: int,
    text: str,
    size: int = 2200,
    bold: bool = False,
    color: str = "172033",
    fill: str | None = None,
    border: str | None = None,
) -> str:
    fill_xml = '<a:noFill/>' if fill is None else f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
    line_xml = '<a:ln><a:noFill/></a:ln>' if border is None else f'<a:ln w="12700"><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:ln>'
    bold_attr = ' b="1"' if bold else ""
    return f"""
      <p:sp>
        <p:nvSpPr><p:cNvPr id="{shape_id}" name="TextBox {shape_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}</p:spPr>
        <p:txBody><a:bodyPr wrap="square" anchor="mid" lIns="100000" rIns="100000" tIns="60000" bIns="60000"/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="{size}"{bold_attr}><a:solidFill><a:srgbClr val="{color}"/></a:solidFill></a:rPr><a:t>{esc(text)}</a:t></a:r><a:endParaRPr lang="en-US" sz="{size}"/></a:p>
        </p:txBody>
      </p:sp>"""


def bullet_box(shape_id: int, x: int, y: int, cx: int, cy: int, bullets: list[str]) -> str:
    paras = []
    for item in bullets:
        paras.append(
            f"""<a:p><a:pPr marL="285750" indent="-171450"><a:buChar char="-"/></a:pPr>
              <a:r><a:rPr lang="en-US" sz="2050"><a:solidFill><a:srgbClr val="263040"/></a:solidFill></a:rPr><a:t>{esc(item)}</a:t></a:r>
              <a:endParaRPr lang="en-US" sz="2050"/></a:p>"""
        )
    return f"""
      <p:sp>
        <p:nvSpPr><p:cNvPr id="{shape_id}" name="Bullets {shape_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
        <p:txBody><a:bodyPr wrap="square" lIns="90000" rIns="90000" tIns="50000" bIns="50000"/><a:lstStyle/>{''.join(paras)}</p:txBody>
      </p:sp>"""


def image(shape_id: int, rel_id: str, x: int, y: int, cx: int, cy: int) -> str:
    return f"""
      <p:pic>
        <p:nvPicPr><p:cNvPr id="{shape_id}" name="Picture {shape_id}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="{rel_id}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>"""


def arrow(shape_id: int, x: int, y: int, cx: int, cy: int) -> str:
    return f"""
      <p:sp>
        <p:nvSpPr><p:cNvPr id="{shape_id}" name="Arrow {shape_id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
          <a:prstGeom prst="line"><a:avLst/></a:prstGeom>
          <a:ln w="25400"><a:solidFill><a:srgbClr val="475569"/></a:solidFill><a:tailEnd type="triangle"/></a:ln>
        </p:spPr>
      </p:sp>"""


def workflow_box(shape_id: int, x: int, y: int, title: str, subtitle: str, highlight: bool = False) -> str:
    fill = "FFF7ED" if highlight else "EAF6FF"
    border = "B45309" if highlight else "1D75BB"
    return f"""
      <p:sp>
        <p:nvSpPr><p:cNvPr id="{shape_id}" name="Workflow {shape_id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="1_590_000" cy="860000"/></a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
          <a:ln w="19050"><a:solidFill><a:srgbClr val="{border}"/></a:solidFill></a:ln>
        </p:spPr>
        <p:txBody><a:bodyPr wrap="square" anchor="mid" lIns="95000" rIns="95000" tIns="55000" bIns="55000"/><a:lstStyle/>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1500" b="1"><a:solidFill><a:srgbClr val="122033"/></a:solidFill></a:rPr><a:t>{esc(title)}</a:t></a:r></a:p>
          <a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="en-US" sz="1250"><a:solidFill><a:srgbClr val="334155"/></a:solidFill></a:rPr><a:t>{esc(subtitle)}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>""".replace("1_590_000", "1590000")


def workflow_slide_parts(start_id: int) -> tuple[list[str], int]:
    parts: list[str] = []
    next_id = start_id
    parts.append(box(next_id, 550000, 970000, 4_200_000, 300000, "Main LMS Journey", size=1450, bold=True, color="203040"))
    next_id += 1

    steps = [
        (520000, 1_390_000, "1. Login", "Access LMS", False),
        (2_360_000, 1_390_000, "2. Publish Course", "Instructor adds content", True),
        (4_200_000, 1_390_000, "3. Enroll", "Learner joins course", False),
        (6_040_000, 1_390_000, "4. Learn", "Complete modules", False),
        (7_880_000, 1_390_000, "5. Assess", "Quiz is submitted", False),
        (9_720_000, 1_390_000, "6. Complete", "Progress recorded", False),
        (7_880_000, 2_850_000, "7. Certificate", "PDF generated", False),
        (9_720_000, 2_850_000, "8. Report", "Results visible", False),
    ]
    for x, y, title, subtitle, highlight in steps:
        parts.append(workflow_box(next_id, x, y, title, subtitle, highlight))
        next_id += 1

    for x in [2_120_000, 3_960_000, 5_800_000, 7_640_000, 9_480_000]:
        parts.append(arrow(next_id, x, 1_820_000, 220000, 0))
        next_id += 1
    parts.append(arrow(next_id, 10_520_000, 2_250_000, 0, 480000))
    next_id += 1
    parts.append(arrow(next_id, 9_470_000, 3_280_000, 240000, 0))
    next_id += 1

    parts.append(box(next_id, 560000, 4_140_000, 4_300_000, 260000, "People Who Use The System", size=1400, bold=True, color="203040"))
    next_id += 1
    role_boxes = [
        (560000, "Learner", "Learn, assess, get certificates"),
        (3_070_000, "Instructor", "Create and publish training"),
        (5_580_000, "Sysadmin", "Manage users, roles, reports"),
    ]
    for x, title, subtitle in role_boxes:
        parts.append(workflow_box(next_id, x, 4_500_000, title, subtitle, False))
        next_id += 1

    parts.append(box(next_id, 560000, 5_520_000, 4_800_000, 260000, "Database Tables Used By The System", size=1400, bold=True, color="203040"))
    next_id += 1
    db_boxes = [
        (560000, 5_880_000, "Users & Roles", "users, profiles, user_roles"),
        (3_070_000, 5_880_000, "Courses & Modules", "courses, course_modules"),
        (5_580_000, 5_880_000, "Learning Records", "enrollments, results, history"),
        (8_090_000, 5_880_000, "Certificates & Audit", "certifications, notifications, audit_logs"),
    ]
    for x, y, title, subtitle in db_boxes:
        parts.append(workflow_box(next_id, x, y, title, subtitle, False))
        next_id += 1

    parts.append(box(next_id, 560000, 6_860_000, 11_650_000, 310000, "Plain reading: the LMS workflow is supported by database tables for users, courses, enrollments, assessments, certificates, notifications, and audit history.", size=1200, color="334155", fill="FFFFFF", border="94A3B8"))
    next_id += 1
    return parts, next_id


def slide_xml(slide: dict, idx: int) -> str:
    parts = [
        box(2, 450000, 250000, 10_800_000, 520000, slide["title"], size=3000, bold=True, color="0F2A45"),
    ]
    next_id = 3
    if LOGO.exists():
        parts.append(image(next_id, "rIdLogo", 11_760_000, 210000, 850000, 850000))
        next_id += 1

    if slide.get("kind") == "title":
        parts.append(box(next_id, 700000, 1_470_000, 9_900_000, 760000, slide["subtitle"], size=2450, color="42526B"))
        next_id += 1
        parts.append(bullet_box(next_id, 760000, 2_520_000, 9_500_000, 1_500_000, slide["bullets"]))
    elif slide.get("kind") == "workflow":
        extra_parts, next_id = workflow_slide_parts(next_id)
        parts.extend(extra_parts)
    elif "columns" in slide:
        col_count = len(slide["columns"])
        col_w = int(11_600_000 / col_count)
        for i, (heading, items) in enumerate(slide["columns"]):
            x = 520000 + i * col_w
            parts.append(box(next_id, x, 1_350_000, col_w - 180000, 520000, heading, size=2050, bold=True, color="FFFFFF", fill="0F5B8F", border="0F5B8F"))
            next_id += 1
            parts.append(bullet_box(next_id, x, 2_010_000, col_w - 180000, 3_900_000, items))
            next_id += 1
    elif "image" in slide:
        parts.append(image(next_id, "rIdDfd", 930000, 1_300_000, 11_300_000, 4_900_000))
        next_id += 1
        parts.append(box(next_id, 1_000_000, 6_330_000, 11_000_000, 360000, slide["caption"], size=1500, color="42526B"))
    else:
        parts.append(bullet_box(next_id, 800000, 1_300_000, 11_300_000, 5_200_000, slide["bullets"]))

    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7FAFC"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      {''.join(parts)}
      {box(98, 11_300_000, 7_010_000, 1_350_000, 230000, str(idx), size=1000, color="728096")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>"""


def rels_for_slide(slide: dict) -> str:
    rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>']
    if LOGO.exists():
        rels.append('<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/cbs-logo-icon.png"/>')
    if slide.get("image") == "dfd":
        rels.append('<Relationship Id="rIdDfd" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/DFD_Level1@2x.png"/>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{''.join(rels)}</Relationships>"""


def fixed_parts() -> dict[str, str]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    slide_overrides = "\n".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, len(slides) + 1)
    )
    slide_ids = "\n".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i}"/>' for i in range(1, len(slides) + 1)
    )
    pres_rels = "\n".join(
        f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, len(slides) + 1)
    )
    pres_rels += '\n<Relationship Id="rIdMaster" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    return {
        "[Content_Types].xml": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  {slide_overrides}
</Types>""",
        "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>""",
        "docProps/core.xml": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>CBS LMS Presentation</dc:title><dc:creator>Codex</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>""",
        "docProps/app.xml": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>{len(slides)}</Slides>
</Properties>""",
        "ppt/presentation.xml": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst>
  <p:sldIdLst>{slide_ids}</p:sldIdLst>
  <p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle/>
</p:presentation>""",
        "ppt/_rels/presentation.xml.rels": f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{pres_rels}</Relationships>""",
        "ppt/slideMasters/slideMaster1.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>""",
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>""",
        "ppt/slideLayouts/slideLayout1.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>""",
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>""",
        "ppt/theme/theme1.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="CBS Theme"><a:themeElements><a:clrScheme name="CBS"><a:dk1><a:srgbClr val="172033"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0F2A45"/></a:dk2><a:lt2><a:srgbClr val="F7FAFC"/></a:lt2><a:accent1><a:srgbClr val="0F5B8F"/></a:accent1><a:accent2><a:srgbClr val="F59E0B"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="6366F1"/></a:accent4><a:accent5><a:srgbClr val="EF4444"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>""",
    }


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    media_files: list[tuple[Path, str]] = []
    if LOGO.exists():
        media_files.append((LOGO, "ppt/media/cbs-logo-icon.png"))
    if DFD.exists():
        media_files.append((DFD, "ppt/media/DFD_Level1@2x.png"))

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in fixed_parts().items():
            zf.writestr(name, data)
        for i, slide in enumerate(slides, 1):
            zf.writestr(f"ppt/slides/slide{i}.xml", slide_xml(slide, i))
            zf.writestr(f"ppt/slides/_rels/slide{i}.xml.rels", rels_for_slide(slide))
        for src, arcname in media_files:
            zf.write(src, arcname)
    print(OUT)


if __name__ == "__main__":
    main()
