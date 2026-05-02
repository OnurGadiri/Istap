from __future__ import annotations

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from .models import JobSeekerProfile


def render_cv_pdf(profile: JobSeekerProfile, buffer: BytesIO) -> None:
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        name="CvTitle",
        parent=styles["Heading1"],
        fontSize=18,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12,
    )
    h2 = ParagraphStyle(
        name="CvH2",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#1e40af"),
        spaceBefore=14,
        spaceAfter=6,
    )
    body = ParagraphStyle(
        name="CvBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
    )

    u = profile.user
    name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email
    story: list = [Paragraph(escape(name), title), Spacer(1, 0.2 * cm)]

    def add_section(label: str, text: str) -> None:
        t = (text or "").strip()
        if not t:
            return
        story.append(Paragraph(escape(label), h2))
        safe = escape(t).replace("\n", "<br/>")
        story.append(Paragraph(safe, body))
        story.append(Spacer(1, 0.15 * cm))

    add_section("Haqqında", profile.bio)
    line_parts = [profile.location, profile.work_mode]
    add_section("Ümumi", " · ".join(p for p in line_parts if p))
    add_section("Bacarıqlar", profile.skills)
    add_section("Dillər", profile.languages)
    add_section("Əməkhaqqı gözləntisi", profile.salary_expectation)
    add_section("Üstünlük verilən ölkələr", profile.preferred_countries)
    add_section("LinkedIn", profile.linkedin_url)
    add_section("GitHub", profile.github_url)
    add_section("Portfolio", profile.portfolio_url)

    doc.build(story)
