/**
 * Server-side HTML template for PDF report generation.
 * Mirrors the design of components/PDFReportTemplate.tsx as closely as possible
 * using inline CSS (no Tailwind/React needed server-side).
 *
 * Image assets are referenced via the SITE_BASE_URL env var.
 */

const SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://pathfinder.appli.global').replace(/\/$/, '');

function asset(path: string): string {
  return `${SITE_BASE_URL}/${path.replace(/^\//, '')}`;
}

function clean(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function h(text: string | undefined): string {
  return escapeHtml(clean(text));
}

// Build degree abbreviation (matches the logic in PDFReportTemplate.tsx)
function degreeAbbr(courseName: string): string {
  const name = courseName.toLowerCase();
  if (name.includes('bachelor of business administration') || name.includes('bba')) return 'BBA';
  if (name.includes('bachelor of computer applications') || name.includes('bca')) return 'BCA';
  if (name.includes('bachelor of commerce') || name.includes('b.com')) return 'B.Com';
  if (name.includes('bachelor of science') || name.includes('b.sc')) return 'B.Sc';
  if (name.includes('bachelor of arts') || name.includes('b.a')) return 'B.A.';
  if (name.includes('bachelor of technology') || name.includes('b.tech')) return 'B.Tech';
  if (name.includes('bachelor of engineering') || name.includes('b.e')) return 'B.E.';
  if (name.includes('bachelor of design') || name.includes('b.des')) return 'B.Des';
  if (name.includes('bachelor of architecture') || name.includes('b.arch')) return 'B.Arch';
  if (name.includes('mbbs') || name.includes('medicine')) return 'MBBS';
  if (name.includes('master of business administration') || name.includes('mba')) return 'MBA';
  if (name.includes('master of science') || name.includes('m.sc')) return 'M.Sc';
  if (name.includes('master of arts') || name.includes('m.a')) return 'M.A.';
  if (name.includes('master of technology') || name.includes('m.tech')) return 'M.Tech';
  const parts = courseName.split(' ');
  if (parts[0] === 'Bachelor') return 'Deg.';
  if (parts[0] === 'Master') return 'Mast.';
  return parts[0].substring(0, 4);
}

/**
 * Generate the full HTML for the styled PDF report.
 * `analysis` is expected to be the stored analysis object (with `analysis.data` containing the AnalysisResult).
 */
export function generateReportHtml(analysis: any): string {
  const data = analysis?.data || analysis;
  const archetype = data?.archetype || {};
  const drivers = archetype?.drivers || {};
  const visionBoard = data?.visionBoard || {};
  const skillSignature = data?.skillSignature || [];
  const recommendations = data?.recommendations || [];
  const alternativePathways = data?.alternativePathways || [];
  const communityStats = data?.communityStats || {};
  const parentLetter = data?.parentLetterData;
  const degreePreference = data?.degreePreferenceAnalysis;
  const userName = data?.userData?.name || 'Future Leader';

  const matchScore = recommendations.length > 0 ? recommendations[0].relevanceScore : 98;

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: '2-digit',
  }).toUpperCase();

  // Key themes for the SVG diagram
  const keyThemes: string[] = visionBoard.keyThemes || [];

  // Build the satellite node SVG for each theme
  function themeNode(theme: string, tx: number, ty: number): string {
    if (!theme) return '';
    const words = theme.split('-');
    const isMulti = words.length > 1;
    const fontSize = isMulti ? 22 : 26;
    const textContent = isMulti
      ? words.map((w: string, i: number) =>
          `<tspan x="0" dy="${i === 0 ? `-${(words.length - 1) * 14}` : '28'}">${h(w)}</tspan>`
        ).join('')
      : `<tspan>${h(theme)}</tspan>`;
    return `
      <g transform="translate(${tx}, ${ty})">
        <circle cx="0" cy="0" r="115" fill="#0B0B1E" stroke="#10b981" stroke-width="2"/>
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${fontSize}" font-weight="600" font-family="sans-serif">${textContent}</text>
      </g>`;
  }

  // Skill signature progress bars
  const skillBarsHtml = skillSignature.map((skill: any) => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">
        <span>${h(skill.subject)}</span>
        <span style="color:#94a3b8;">${skill.A}%</span>
      </div>
      <div style="width:100%;background:#f1f5f9;border-radius:9999px;height:8px;overflow:hidden;">
        <div style="height:100%;width:${skill.A}%;background:#ED1164;border-radius:9999px;"></div>
      </div>
    </div>
  `).join('');

  // Recommendations cards
  const recsHtml = recommendations.map((rec: any) => `
    <div style="display:flex;gap:32px;align-items:flex-start;padding-bottom:24px;border-bottom:1px solid #e2e8f0;">
      <div style="width:128px;height:160px;position:relative;flex-shrink:0;">
        <img src="${asset('icon-doc-blue.png')}" alt="Degree" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 15px rgba(0,0,0,0.1));"/>
        <div style="position:absolute;top:32px;left:0;width:100%;text-align:center;color:white;font-family:serif;font-size:24px;font-weight:700;padding:0 8px;">
          ${rec.degree ? h(rec.degree.split(' ')[0].replace('.', '')) : 'DEG'}
        </div>
        <div style="position:absolute;bottom:10px;left:0;width:100%;text-align:center;color:white;font-size:10px;font-weight:700;">
          ${rec.relevanceScore}% Match
        </div>
      </div>
      <div style="flex:1;padding-top:8px;">
        <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 8px 0;line-height:1.3;">${h(rec.courseName)}</h3>
        <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 12px;text-align:justify;">${h(rec.matchReason)}</p>
        <div style="background:#f8fafc;border-radius:12px;padding:12px;display:flex;gap:12px;border:1px solid #f1f5f9;">
          <div style="color:#1d4ed8;flex-shrink:0;margin-top:2px;">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <p style="font-size:12px;color:#64748b;margin:0;line-height:1.5;">
            <strong style="color:#334155;">AI Insight:</strong> ${h(rec.dataInsight)}
          </p>
        </div>
      </div>
    </div>
  `).join('');

  // Alternative pathways
  const altHtml = alternativePathways.map((alt: any, i: number) => `
    <div style="display:flex;flex-direction:column;gap:16px;${i < alternativePathways.length - 1 ? 'border-right:1px solid #e2e8f0;padding-right:24px;' : ''}">
      <div style="width:96px;height:128px;position:relative;flex-shrink:0;margin:0 auto;">
        <img src="${asset('icon-doc-pink.png')}" alt="Course" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));"/>
        <div style="position:absolute;top:24px;left:0;width:100%;text-align:center;color:white;font-family:serif;font-size:18px;font-weight:700;padding:0 4px;">
          ${h(degreeAbbr(alt.courseName))}
        </div>
        <div style="position:absolute;bottom:8px;left:0;width:100%;text-align:center;color:white;font-size:9px;font-weight:700;">
          ${alt.relevanceScore || 85}% Match
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">${h(alt.focus)}</div>
        <h4 style="font-weight:700;color:#0f172a;margin:0 0 8px;line-height:1.3;height:40px;overflow:hidden;font-size:14px;">${h(alt.courseName)}</h4>
        <p style="font-size:10px;color:#64748b;line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;">${h(alt.insight)}</p>
      </div>
    </div>
  `).join('');

  // Community top careers
  const careersHtml = (communityStats.topCareers || []).map((career: any) => `
    <div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#334155;margin-bottom:4px;">
        <span>${h(career.name)}</span>
        <span>${career.percentage}%</span>
      </div>
      <div style="width:100%;background:#e2e8f0;border-radius:9999px;height:8px;">
        <div style="height:100%;width:${career.percentage}%;background:#ED1164;border-radius:9999px;"></div>
      </div>
    </div>
  `).join('');

  // Common interests tags
  const interestsHtml = (communityStats.commonInterests || []).map((interest: string) =>
    `<span style="padding:8px 16px;background:rgba(226,232,240,0.5);border-radius:8px;font-size:12px;font-weight:700;color:#334155;">${h(interest)}</span>`
  ).join('');

  // Drivers section
  const driversList = [
    { title: 'Academic Driver', icon: 'icon-academic.png', data: drivers.academic },
    { title: 'Passion Driver', icon: 'icon-passion.png', data: drivers.passion },
    { title: 'Cognitive Style', icon: 'icon-cognitive.png', data: drivers.cognitive },
    { title: 'Preferred Domain', icon: 'icon-domain.png', data: drivers.domain },
    { title: 'Core Motivation', icon: 'icon-motivation.png', data: drivers.motivation },
  ];

  const driversHtml = driversList.map((driver, i) => `
    <div style="display:flex;gap:24px;align-items:flex-start;padding-bottom:32px;${i < driversList.length - 1 ? 'border-bottom:1px solid #e2e8f0;' : ''}">
      <div style="width:64px;height:64px;border-radius:50%;background:#f8fafc;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:12px;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #f1f5f9;">
        <img src="${asset(driver.icon)}" alt="${driver.title}" style="width:100%;height:100%;object-fit:contain;"/>
      </div>
      <div style="flex:1;">
        <h3 style="font-size:24px;font-weight:700;color:#0F0F25;margin:0 0 8px;">${h(driver.title)}</h3>
        <p style="font-size:18px;color:#475569;line-height:1.6;margin:0;">${h(driver.data?.explanation)}</p>
      </div>
    </div>
  `).join('');

  // Stated Preference page (optional)
  const statedPrefHtml = degreePreference ? `
    <!-- PAGE 7: STATED PREFERENCE -->
    <div class="page" style="padding:48px 64px;display:flex;flex-direction:column;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;right:0;width:500px;height:500px;background:#faf5ff;border-radius:50%;filter:blur(100px);pointer-events:none;transform:translateX(33%) translateY(-33%);z-index:0;"></div>

      <div style="margin-bottom:48px;position:relative;z-index:1;">
        <h2 style="font-size:36px;font-weight:800;color:#1a1a2e;margin:0 0 16px;">${h('Your Stated Preference')}</h2>
        <p style="color:#64748b;font-size:18px;line-height:1.6;margin:0;">
          You mentioned interest in <span style="font-weight:700;color:#ED1164;">${h(degreePreference.statedPreference)}</span>.
          Here&apos;s how well it aligns with your personality profile:
        </p>
      </div>

      <div style="margin-bottom:64px;padding:32px;background:#f0fdf4;border-radius:16px;border:1px solid #dcfce7;display:flex;gap:24px;align-items:flex-start;position:relative;z-index:1;">
        <div style="width:48px;height:48px;border-radius:50%;background:white;border:1px solid #bbf7d0;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <svg width="24" height="24" fill="none" stroke="#22c55e" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        </div>
        <div>
          <h4 style="font-weight:700;color:#15803d;font-size:16px;margin:0 0 4px;">Overall Assessment</h4>
          <p style="color:#166534;font-size:14px;line-height:1.6;margin:0;">${h(degreePreference.overallInsight)}</p>
        </div>
      </div>

      <h2 style="font-size:20px;font-weight:700;letter-spacing:0.2em;color:#64748b;text-transform:uppercase;margin:0 0 48px;position:relative;z-index:1;">Matching Programs &amp; Fit Analysis</h2>

      <div style="display:flex;flex-direction:column;gap:48px;position:relative;z-index:1;">
        ${(degreePreference.matchedCourses || []).map((course: any, i: number) => `
          <div style="display:flex;gap:32px;align-items:flex-start;position:relative;">
            <div style="width:112px;height:144px;position:relative;flex-shrink:0;">
              <img src="${asset('icon-doc-purple.svg')}" alt="Degree Preference" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 10px 15px rgba(0,0,0,0.1));"/>
              <div style="position:absolute;top:0;left:0;width:100%;text-align:center;color:white;font-family:serif;font-size:24px;font-weight:700;padding:0 8px;pointer-events:none;display:flex;align-items:center;justify-content:center;height:82%;">
                ${h(course.degree?.split(' ')[0]?.replace('.', '') || '')}
              </div>
              <div style="position:absolute;bottom:0;left:0;right:0;height:18%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
                <span style="color:white;font-size:11px;font-weight:700;letter-spacing:0.05em;">${course.matchPercentage}% Match</span>
              </div>
            </div>
            <div style="flex:1;padding-top:8px;">
              <h3 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px;">${h(course.courseName)}</h3>
              <p style="color:#475569;line-height:1.6;font-size:14px;margin:0;text-align:justify;">${h(course.matchInsight)}</p>
            </div>
            ${i < degreePreference.matchedCourses.length - 1 ? '<div style="position:absolute;bottom:-24px;left:144px;right:0;height:1px;background:#f1f5f9;"></div>' : ''}
          </div>
        `).join('')}
      </div>

      <div style="flex:1;"></div>

      <div style="background:#f8fafc;padding:16px;border-radius:12px;text-align:center;position:relative;z-index:1;">
        <p style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:0;">
          NOTE: These match percentages reflect how well your stated preference aligns with your personality profile based on your quiz responses.
        </p>
      </div>
    </div>
  ` : '';

  // Parent Letter page
  const parentLetterHtml = parentLetter ? `
    <div style="font-size:13px;color:#334155;line-height:1.65;max-width:95%;white-space:pre-line;letter-spacing:-0.01em;margin-top:80px;">
      <p>${h(parentLetter.salutation)}</p>
      <p>${h(parentLetter.paragraph1)}</p>
      <p>${h(parentLetter.paragraph2)}</p>
      <p>${h(parentLetter.paragraph3)}</p>
      <p>${h(parentLetter.paragraph4)}</p>
      <p>${h(parentLetter.paragraph5)}</p>
      <p>${h(parentLetter.paragraph6)}</p>
      <p>${h(parentLetter.paragraph7)}</p>
      <p>${h(parentLetter.paragraph8)}</p>
      <div style="padding-top:8px;font-size:13.5px;white-space:nowrap;color:#334155;line-height:1.5;">
        <div>Warm regards,</div>
        <div>Appli</div>
        <a href="https://www.appli.global" style="color:#ED1164;text-decoration:none;">www.appli.global</a>
      </div>
    </div>
  ` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><p style="color:#94a3b8;">Personalized letter generating...</p></div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=794"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: 794px;
    background: white;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 794px;
    height: 1123px;
    max-height: 1123px;
    overflow: hidden;
    page-break-after: always;
    position: relative;
  }

  .page:last-child { page-break-after: auto; }

  img { max-width: 100%; }

  p { margin: 0 0 12px; }
</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div class="page" style="background:#1a0b2e;display:flex;flex-direction:column;justify-content:space-between;padding:48px;color:white;">
  <div style="position:absolute;inset:0;z-index:0;">
    <img src="${asset('report-cover-bg.png')}" style="width:100%;height:100%;object-fit:cover;" alt=""/>
  </div>
  <div style="display:flex;justify-content:flex-end;padding-top:32px;position:relative;z-index:10;">
    <div style="text-align:right;">
      <h3 style="font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin:0 0 4px;">Assessment Report</h3>
      <p style="font-size:18px;font-weight:700;color:white;letter-spacing:0.1em;margin:0;">${dateStr}</p>
    </div>
  </div>
  <div style="flex:1;"></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:32px;z-index:10;position:relative;">
    <div>
      <h1 style="font-size:72px;font-weight:800;line-height:0.95;letter-spacing:-0.02em;color:white;margin:0;">
        ${h(userName)}<br/>
        <span style="font-size:36px;opacity:0.5;display:block;margin-top:8px;"> </span>
      </h1>
    </div>
    <div style="text-align:right;opacity:0.6;font-size:14px;font-weight:500;letter-spacing:0.05em;">
      pathfinder.appli.global
    </div>
  </div>
</div>

<!-- PAGE 2: ARCHETYPE & MATCH -->
<div class="page" style="background:white;padding:64px;display:flex;flex-direction:column;">
  <div style="position:relative;padding-top:48px;padding-bottom:16px;margin-bottom:32px;display:flex;align-items:center;">
    <div style="position:absolute;top:-32px;right:0;width:100%;max-width:750px;pointer-events:none;z-index:0;">
      <img src="${asset('match-graph.png')}" alt="Match Graph" style="width:100%;height:auto;object-fit:contain;"/>
    </div>
    <div style="position:relative;z-index:10;display:flex;align-items:center;justify-content:flex-start;margin-left:8px;margin-top:16px;width:100%;">
      <span style="font-size:260px;line-height:0.8;font-weight:800;color:#22c55e;letter-spacing:-0.06em;">${matchScore}</span>
      <div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;margin-left:32px;padding-top:16px;">
        <span style="font-size:44px;font-weight:800;color:#0F0F25;line-height:1;letter-spacing:-0.02em;">Match</span>
        <span style="font-size:44px;font-weight:800;color:#0F0F25;line-height:1;letter-spacing:-0.02em;margin-bottom:4px;">Score</span>
        <span style="font-size:130px;font-weight:800;color:#0F0F25;line-height:0.8;letter-spacing:-0.04em;position:relative;left:-4px;">%</span>
      </div>
    </div>
  </div>
  <div style="margin-top:32px;position:relative;z-index:10;">
    <div style="font-size:15px;font-weight:700;letter-spacing:0.2em;color:#6b7280;text-transform:uppercase;margin-bottom:24px;">Archetype Identified</div>
    <h2 style="font-size:56px;font-weight:800;color:#0F0F25;margin:0 0 32px;letter-spacing:-0.02em;line-height:1.1;">${h(archetype.title)}</h2>
    <p style="font-size:24px;line-height:1.6;color:#475569;font-weight:300;text-align:justify;margin:0;">${h(archetype.description)}</p>
  </div>
</div>

<!-- PAGE 3: DRIVERS -->
<div class="page" style="background:white;padding:64px;display:flex;flex-direction:column;justify-content:center;">
  <h2 style="font-size:20px;font-weight:700;letter-spacing:0.2em;color:#64748b;text-transform:uppercase;margin:0 0 48px;">What Drives You</h2>
  <div style="display:flex;flex-direction:column;gap:32px;">
    ${driversHtml}
  </div>
</div>

<!-- PAGE 4: VISION BOARD -->
<div class="page" style="background:white;display:flex;flex-direction:column;overflow:hidden;">
  <div style="padding:48px;flex:1;display:flex;flex-direction:column;justify-content:center;">
    <h4 style="font-size:14px;font-weight:700;letter-spacing:0.2em;color:#94a3b8;text-transform:uppercase;margin:0 0 8px;">Your Career Vision Board</h4>
    <h2 style="font-size:48px;font-weight:800;color:#ED1164;margin:0 0 24px;line-height:1.1;">A Day in Your<br/>Future Life</h2>
    <p style="font-size:20px;line-height:1.6;color:#334155;margin:0;">${h(visionBoard.futureSelf)}</p>
  </div>
  <div style="height:45%;display:flex;min-height:0;">
    <div style="width:65%;background:#090020;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="position:relative;aspect-ratio:1;height:100%;max-height:100%;max-width:800px;display:flex;align-items:center;justify-content:center;padding:32px;">
        <svg viewBox="0 0 800 800" style="width:100%;height:100%;">
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" style="stop-color:#1a0b2e;stop-opacity:1"/>
              <stop offset="100%" style="stop-color:#090020;stop-opacity:1"/>
            </radialGradient>
            <path id="curveTop" d="M 310,400 A 90,90 0 0,1 490,400"/>
            <path id="curveBottom" d="M 310,400 A 90,90 0 0,0 490,400"/>
          </defs>
          <rect width="800" height="800" fill="url(#grad1)"/>
          ${[100,150,200,250,300,350,400,450,500,550,600,650].map(r =>
            `<circle cx="400" cy="400" r="${r}" fill="none" stroke="#3b82f6" stroke-width="0.5" opacity="0.15"/>`
          ).join('')}
          <circle cx="400" cy="400" r="100" fill="#090020" stroke="#3b82f6" stroke-width="1" opacity="0.3"/>
          <circle cx="400" cy="400" r="60" fill="#2563eb"/>
          <path d="M400 370 C 400 385, 400 385, 415 400 C 400 415, 400 415, 400 430 C 400 415, 400 415, 385 400 C 400 385, 400 385, 400 370" fill="white"/>
          <text font-size="11" font-weight="bold" fill="white" letter-spacing="3" text-anchor="middle" style="text-transform:uppercase;">
            <textPath href="#curveTop" startOffset="50%" side="right">Core Themes</textPath>
          </text>
          <text font-size="11" font-weight="bold" fill="white" letter-spacing="3" text-anchor="middle" style="text-transform:uppercase;">
            <textPath href="#curveBottom" startOffset="50%" side="left">Core Themes</textPath>
          </text>
          <text x="390" y="405" fill="white" font-size="10" opacity="0.8">
            <tspan x="302" dy="0">*</tspan>
            <tspan x="492" dy="0">*</tspan>
          </text>
          ${themeNode(keyThemes[0], 235, 235)}
          ${themeNode(keyThemes[1], 565, 235)}
          ${themeNode(keyThemes[2], 235, 565)}
          ${themeNode(keyThemes[3], 565, 565)}
        </svg>
      </div>
    </div>
    <div style="width:35%;background:#ED1164;padding:48px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="flex:1;display:flex;align-items:center;">
        <p style="color:white;font-family:serif;font-size:28px;line-height:1.3;font-weight:500;font-style:italic;margin:0;">
          "${h(visionBoard.quote)}"
        </p>
      </div>
      <div style="color:white;font-size:18px;font-weight:500;text-align:right;margin-top:16px;">
        ${h(visionBoard.quoteAuthor || 'Inspiration')}
      </div>
    </div>
  </div>
</div>

<!-- PAGE 5: SKILL SIGNATURE -->
<div class="page" style="background:white;position:relative;display:flex;flex-direction:column;overflow:hidden;">
  <div style="position:absolute;inset:0;z-index:0;">
    <img src="${asset('skill-signature-bg.svg')}" style="width:100%;height:100%;object-fit:cover;" alt=""/>
  </div>
  <div style="position:relative;z-index:10;padding:64px;display:flex;flex-direction:column;height:100%;">
    <div style="text-align:center;margin-bottom:48px;">
      <h2 style="font-size:48px;font-weight:800;color:#0F0F25;margin:0 0 8px;">Skill Signature</h2>
      <p style="color:#64748b;font-size:18px;margin:0;">A Visual map of your core capabilities</p>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;">
      ${(() => {
        // Build a proper SVG radar chart from skillSignature data
        const cx = 200, cy = 200, maxR = 160;
        const n = skillSignature.length || 6;
        const angleStep = (2 * Math.PI) / n;
        const startAngle = -Math.PI / 2; // Start from top

        // Helper: get (x, y) for a given index and radius
        const point = (i: number, r: number) => {
          const angle = startAngle + i * angleStep;
          return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
        };

        // Hexagonal grid rings at 25%, 50%, 75%, 100%
        const rings = [0.25, 0.5, 0.75, 1.0];
        const gridLines = rings.map(frac => {
          const r = maxR * frac;
          const pts = Array.from({ length: n }, (_, i) => {
            const p = point(i, r);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ');
          return `<polygon points="${pts}" fill="none" stroke="#cbd5e1" stroke-width="1"/>`;
        }).join('\n');

        // Axis lines from center to each vertex
        const axisLines = Array.from({ length: n }, (_, i) => {
          const p = point(i, maxR);
          return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#cbd5e1" stroke-width="0.5"/>`;
        }).join('\n');

        // Data polygon
        const dataPoints = skillSignature.map((skill: any, i: number) => {
          const r = (skill.A / 100) * maxR;
          const p = point(i, r);
          return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }).join(' ');

        // Labels positioned outside the chart
        const labelOffset = 24;
        const labels = skillSignature.map((skill: any, i: number) => {
          const p = point(i, maxR + labelOffset);
          const angle = startAngle + i * angleStep;
          // Determine text-anchor based on position
          let anchor = 'middle';
          if (Math.cos(angle) > 0.3) anchor = 'start';
          else if (Math.cos(angle) < -0.3) anchor = 'end';
          // Slight vertical adjustment
          const dy = Math.sin(angle) > 0.3 ? 12 : (Math.sin(angle) < -0.3 ? -4 : 4);
          return `<text x="${p.x.toFixed(1)}" y="${(p.y + dy).toFixed(1)}" text-anchor="${anchor}" fill="#475569" font-size="12" font-weight="700" font-family="Inter, sans-serif">${h(skill.subject)}</text>`;
        }).join('\n');

        return `<svg viewBox="0 0 400 400" style="width:360px;height:360px;">
          ${gridLines}
          ${axisLines}
          <polygon points="${dataPoints}" fill="rgba(237,17,100,0.3)" stroke="#ED1164" stroke-width="3"/>
          ${labels}
        </svg>`;
      })()}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px 64px;margin-top:48px;">
      ${skillBarsHtml}
    </div>
  </div>
</div>

<!-- PAGE 6: TOP RECOMMENDATIONS -->
<div class="page" style="background:white;padding:48px 64px 40px;display:flex;flex-direction:column;">
  <h2 style="font-size:20px;font-weight:700;letter-spacing:0.2em;color:#64748b;text-transform:uppercase;margin:0 0 40px;flex-shrink:0;">Top Course Recommendations</h2>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:space-around;min-height:0;gap:16px;">
    ${recsHtml}
  </div>
</div>

${statedPrefHtml}

<!-- PAGE 8: ALTERNATIVES & COMMUNITY -->
<div class="page" style="background:white;padding:48px;display:flex;flex-direction:column;overflow:hidden;">
  <div style="margin-bottom:40px;flex-shrink:0;">
    <h2 style="font-size:20px;font-weight:700;letter-spacing:0.2em;color:#64748b;text-transform:uppercase;margin:0 0 32px;">Alternative Pathways</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
      ${altHtml}
    </div>
  </div>
  <div style="width:100%;height:1px;background:#f1f5f9;margin-bottom:32px;flex-shrink:0;"></div>
  <div style="flex:1;background:#F5F3F0;min-height:0;border-radius:24px;padding:40px;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;position:relative;z-index:10;">
      <div style="flex:1;">
        <h2 style="font-size:36px;font-weight:800;color:#1a1a2e;line-height:1.1;margin:0;">Community Insights</h2>
      </div>
      <div style="flex-shrink:0;margin-left:32px;">
        <img src="${asset('community-avatars.png')}" alt="Community" style="height:64px;width:auto;object-fit:contain;"/>
      </div>
    </div>
    <p style="color:#475569;font-size:16px;margin:0 0 40px;position:relative;z-index:10;">${h(communityStats.headline)}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;position:relative;z-index:10;">
      <div>
        <h4 style="font-weight:700;color:#94a3b8;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;margin:0 0 24px;">Common Career Paths</h4>
        ${careersHtml}
      </div>
      <div>
        <h4 style="font-weight:700;color:#94a3b8;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;margin:0 0 24px;">Shared Interests</h4>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          ${interestsHtml}
        </div>
      </div>
    </div>
  </div>
</div>

<!-- PAGE 9: LETTER FOR PARENTS -->
<div class="page" style="background:white;display:flex;flex-direction:column;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;z-index:0;pointer-events:none;">
    <img src="${asset('letter-for-parents-bg.svg')}" alt="" style="width:100%;height:100%;object-fit:cover;"/>
  </div>
  <div style="position:relative;z-index:10;padding:96px 72px 48px;display:flex;flex-direction:column;height:100%;overflow:hidden;">
    ${parentLetterHtml}
  </div>
</div>

<!-- PAGE 10: THANK YOU & ABOUT -->
<div class="page" style="background:white;display:flex;flex-direction:column;position:relative;overflow:hidden;">
  <div style="width:100%;background:#ED1164;color:white;padding:80px 64px 48px;flex-shrink:0;">
    <h1 style="font-size:42px;line-height:1.1;font-weight:400;margin:0 0 24px;letter-spacing:-0.02em;">
      Thank You for<br/>Choosing Clarity
    </h1>
    <p style="font-size:15px;line-height:1.6;max-width:90%;font-weight:300;margin:0 0 48px;opacity:0.95;">
      Choosing to seek clarity before making important academic decisions is a thoughtful and responsible step. By understanding strengths and alignment early, you have already made a wise decision for the future.
    </p>
    <p style="font-size:15px;font-weight:300;opacity:0.95;margin:0;">
      Wishing you the best,<br/>Team Appli
    </p>
  </div>
  <div style="flex:1;padding-top:48px;display:flex;flex-direction:column;position:relative;z-index:10;background:white;overflow:hidden;padding-bottom:24px;">
    <div style="position:absolute;right:-64px;bottom:0;top:-64px;width:85%;z-index:0;pointer-events:none;">
      <img src="${asset('girl-writing.png')}" alt="Student" style="width:100%;height:100%;object-fit:cover;object-position:right bottom;mix-blend-mode:multiply;"/>
    </div>
    <div style="position:relative;z-index:10;max-width:55%;display:flex;flex-direction:column;padding:0 64px;">
      <h2 style="font-size:32px;font-weight:700;color:#1a1a2e;margin:0 0 16px;letter-spacing:-0.02em;">About Appli</h2>
      <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 40px;">
        Appli is India&apos;s first common application and guidance platform created to simplify the college journey for students and families.
      </p>
      <div style="display:flex;flex-direction:column;gap:32px;">
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="color:#ED1164;margin-top:4px;flex-shrink:0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div>
            <h3 style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Career Pathfinder</h3>
            <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">Get clarity on the right course that matches your interests and also has strong future demand.</p>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"/>
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="color:#ED1164;margin-top:4px;flex-shrink:0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div>
            <h3 style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Discover Courses</h3>
            <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">Find a course that matches your interests and goals. Discover the skills you&apos;ll gain, potential careers, and colleges offering it.</p>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"/>
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="color:#ED1164;margin-top:4px;flex-shrink:0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>
          </div>
          <div>
            <h3 style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">Find Colleges</h3>
            <p style="color:#555;font-size:13px;line-height:1.6;margin:0;">Find colleges offering it. Get info on fees, curriculum, alumni, placements, and admissions.</p>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top:auto;padding:24px 64px 0;width:100%;display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:10;flex-shrink:0;">
      <p style="font-weight:700;color:#1a1a2e;font-size:12.5px;max-width:55%;line-height:1.6;margin:0 0 4px;">
        If this platform has helped your family, please share Appli with other students and parents who could benefit.
      </p>
      <div style="display:flex;gap:12px;position:relative;z-index:20;">
        <div style="background:black;color:white;padding:6px 12px;border-radius:6px;display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.05em;line-height:1;">Get it on</span>
            <span style="font-size:13px;font-weight:600;line-height:1;">Google Play</span>
          </div>
        </div>
        <div style="background:black;color:white;padding:6px 12px;border-radius:6px;display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13.03 4.8C13.73 3.96 14.2 2.73 14.07 1.5c-1.06.04-2.35.71-3.09 1.58-.66.75-1.18 2.01-1.01 3.2 1.18.09 2.36-.63 3.06-1.48z"/></svg>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:8px;text-transform:uppercase;letter-spacing:0.05em;line-height:1;">Download on the</span>
            <span style="font-size:13px;font-weight:600;line-height:1;">App Store</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`;
}
