import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const ORIGINAL_AMOUNT_PAISE = 49900; // ₹499

  const handleStart = () => {
    navigate('/quiz?checkout=true');
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = '0';
      htmlEl.style.transform = 'translateY(20px)';
      htmlEl.style.transition = `opacity .5s ${i * 0.06}s ease, transform .5s ${i * 0.06}s ease`;
      observer.observe(htmlEl);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-body">
      {/* NAV */}
      <nav className="landing-nav">
        <div className="nav-logo">appli <span>·</span> Pathfinder</div>
        <button onClick={handleStart} className="nav-cta">Get Started — ₹499</button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-grid"></div>

        <div className="hero-badge">
          <div className="hero-badge-dot"></div>
          Trusted by 2,00,000+ students across India
        </div>

        <h1>Discover the Right<br /><em>Career Path</em> for You</h1>

        <p className="hero-sub">
          A structured assessment that identifies your strengths, interests, and aptitude — and connects you to real, relevant career options.
        </p>

        <div className="hero-trust">
          <div className="hero-trust-avatars">
            <div className="avatar-ring">R</div>
            <div className="avatar-ring">A</div>
            <div className="avatar-ring">S</div>
            <div className="avatar-ring">P</div>
          </div>
          Built and validated with IIM professors, counsellors & parents
        </div>

        <div className="hero-actions">
          <button onClick={handleStart} className="btn-primary-new">
            Get My Personalised Report
            <span className="btn-arrow">→</span>
          </button>
          <span className="price-note">One-time report · <strong>₹499 only</strong> · Instant delivery</span>
        </div>

        <div className="scroll-pill">
          <div className="scroll-pill-line"></div>
          Scroll to explore
        </div>
      </div>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat-item reveal">
            <div className="stat-num">2L+</div>
            <div className="stat-label">Students assessed</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-num">98%</div>
            <div className="stat-label">Satisfaction rate</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-num">120+</div>
            <div className="stat-label">Career pathways mapped</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-num">15 min</div>
            <div className="stat-label">Average completion time</div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <div className="how-layout">
          <div>
            <span className="section-tag">How it works</span>
            <h2 className="section-title">Science-backed questions. Instant clarity.</h2>
            <p className="section-body">Our Q&A flow is built on validated psychological frameworks, refined by hundreds of hours of expert input.</p>

            <div className="steps">
              <div className="step-item reveal">
                <div className="step-num">01</div>
                <div className="step-content">
                  <h3>Answer 10 guided questions</h3>
                  <p>Psychologically validated prompts that reveal your personality type, learning style, and aptitude clusters.</p>
                </div>
              </div>
              <div className="step-item reveal">
                <div className="step-num">02</div>
                <div className="step-content">
                  <h3>Our engine analyses your responses</h3>
                  <p>Cross-referenced against career outcome data from thousands of students across India.</p>
                </div>
              </div>
              <div className="step-item reveal">
                <div className="step-num">03</div>
                <div className="step-content">
                  <h3>Receive your detailed report instantly</h3>
                  <p>A personalised PDF with career archetypes, degree recommendations, and your unique skill signature.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="phone-mockup">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="phone-body">
                  <div className="phone-q-label">Question 8 of 10</div>
                  <div className="phone-progress"><div className="phone-progress-fill"></div></div>
                  <div className="phone-question">When facing a complex problem, you prefer to…</div>
                  <div className="phone-options">
                    <div className="phone-option">Break it into smaller parts</div>
                    <div className="phone-option active">Talk it through with someone</div>
                    <div className="phone-option">Research before acting</div>
                    <div className="phone-option">Trust your instinct</div>
                  </div>
                  <div className="phone-cta-mini" onClick={handleStart}>Next →</div>
                </div>
              </div>
            </div>
            <div className="phone-chip chip1"><i className="ph-fill ph-brain"></i> Psychology-validated</div>
            <div className="phone-chip chip2"><i className="ph-fill ph-file-pdf"></i> Instant PDF report</div>
            <div className="phone-chip chip3"><i className="ph-fill ph-target"></i> Match score %</div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <div className="gets-section">
        <div className="gets-inner">
          <div className="gets-header">
            <div>
              <span className="section-tag">What you'll get</span>
              <h2 className="section-title">Everything in one detailed report</h2>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '320px', fontWeight: 300, lineHeight: 1.6 }}>Your report doesn't just tell you what careers exist. It tells you which ones fit <em>you</em>.</p>
          </div>

          <div className="gets-grid">
            <div className="get-card reveal">
              <div className="get-icon"><i className="ph-fill ph-chart-bar"></i></div>
              <h3>Career Archetypes with Match Scores</h3>
              <p>Discover which career archetypes align most naturally with your personality and aptitude — scored and ranked for you.</p>
            </div>
            <div className="get-card reveal">
              <div className="get-icon"><i className="ph-fill ph-graduation-cap"></i></div>
              <h3>Top Course Recommendations</h3>
              <p>Tailored degree and stream recommendations based on your responses, not generic advice.</p>
            </div>
            <div className="get-card reveal">
              <div className="get-icon"><i className="ph-fill ph-map-trifold"></i></div>
              <h3>Your Skill Signature Map</h3>
              <p>A visual breakdown of your core strengths across analytical, creative, interpersonal, and technical domains.</p>
            </div>
            <div className="get-card reveal">
              <div className="get-icon"><i className="ph-fill ph-rocket-launch"></i></div>
              <h3>Clear Future Career Direction</h3>
              <p>Specific career paths to aim for, with realistic timelines and the steps to get there.</p>
            </div>
            <div className="get-card reveal">
              <div className="get-icon"><i className="ph-fill ph-arrows-split"></i></div>
              <h3>Alternative Pathways</h3>
              <p>Surprising careers you may not have considered — often the ones that turn out to be the best fit.</p>
            </div>
            <div className="get-card reveal" style={{ background: 'var(--brand)', borderColor: 'transparent', color: '#fff' }}>
              <div className="get-icon" style={{ background: 'rgba(255,255,255,0.15)' }}><i className="ph-fill ph-star" style={{ color: '#fff' }}></i></div>
              <h3 style={{ color: '#fff' }}>All of this for just ₹499</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)' }}>One payment. Instant report. Clarity that could change your entire academic journey.</p>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST */}
      <section className="landing-section trust-section">
        <span className="section-tag">Expert validation</span>
        <h2 className="section-title">Built with people who understand students</h2>
        <p className="section-body">Our assessment framework has been developed and refined in collaboration with education's most trusted voices.</p>

        <div className="trust-logos">
          <div className="trust-badge reveal">
            <div className="trust-badge-icon"><i className="ph-fill ph-chalkboard-teacher"></i></div>
            <div className="trust-badge-label">IIM Professors</div>
          </div>
          <div className="trust-badge reveal">
            <div className="trust-badge-icon"><i className="ph-fill ph-user-circle"></i></div>
            <div className="trust-badge-label">School Counsellors</div>
          </div>
          <div className="trust-badge reveal">
            <div className="trust-badge-icon"><i className="ph-fill ph-buildings"></i></div>
            <div className="trust-badge-label">Academicians</div>
          </div>
          <div className="trust-badge reveal">
            <div className="trust-badge-icon"><i className="ph-fill ph-users-three"></i></div>
            <div className="trust-badge-label">Parents</div>
          </div>
          <div className="trust-badge reveal">
            <div className="trust-badge-icon"><i className="ph-fill ph-student"></i></div>
            <div className="trust-badge-label">Students</div>
          </div>
        </div>

        <div className="testimonials">
          <div className="testimonial-card reveal">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">"I had no idea what stream to pick after 10th. Pathfinder's report gave me direction I didn't expect — it recommended design thinking careers and I'm now studying at NID."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">R</div>
              <div>
                <div className="testimonial-name">Riya Sharma</div>
                <div className="testimonial-meta">Class 11, Delhi</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card reveal">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">"As a parent, I was worried about pressure on my son. The Pathfinder report helped us have a calm, evidence-based conversation about his future. Totally worth ₹499."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg,#a8d8ff,#6ab4ff)' }}>A</div>
              <div>
                <div className="testimonial-name">Anand Krishnan</div>
                <div className="testimonial-meta">Parent, Bengaluru</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card reveal">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">"The skill signature map was eye-opening. I realised I'm strong in systems thinking and it pointed me towards engineering management — something I'd never heard of."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" style={{ background: 'linear-gradient(135deg,#b3ffd9,#5de09a)' }}>S</div>
              <div>
                <div className="testimonial-name">Siddharth Patel</div>
                <div className="testimonial-meta">Class 12, Ahmedabad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <div className="pricing-section" id="pricing">
        <span className="section-tag">Pricing</span>
        <h2 className="section-title">One report. A lifetime of direction.</h2>
        <p className="section-body">No subscriptions. No renewals. Pay once, get your full report instantly.</p>

        <div className="pricing-card">
          <div>
            <span className="price-currency">₹</span><span className="price-amount">499</span>
          </div>
          <p className="price-period">Single counselling · One-time payment</p>

          <ul className="price-includes">
            <li><span className="price-check">✓</span> Career Archetypes with Match Scores</li>
            <li><span className="price-check">✓</span> Top Course Recommendations</li>
            <li><span className="price-check">✓</span> Skill Signature Map</li>
            <li><span className="price-check">✓</span> Future Career Direction</li>
            <li><span className="price-check">✓</span> Alternative Pathways</li>
            <li><span className="price-check">✓</span> Instant PDF report delivery</li>
          </ul>

          <button onClick={handleStart} className="btn-pricing">Get My Personalised Report →</button>
        </div>
      </div>

      {/* FAQ */}
      <section className="landing-section">
        <div className="faq-layout">
          <div>
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">Questions you might have</h2>
            <p className="section-body">Everything you need to know before you start.</p>
          </div>

          <div className="faq-items">
            {[
              { q: "Who is Pathfinder for?", a: "Pathfinder is built for students in Class 10, 11, and 12 who are unsure about their stream, degree, or career direction. It's also useful for parents looking to support their child with data-backed clarity." },
              { q: "How long does the assessment take?", a: "Most students complete the 10-question assessment in 5–8 minutes. There are no right or wrong answers — just respond honestly for the most accurate report." },
              { q: "When do I receive my report?", a: "Your report is generated instantly after you complete the assessment. You'll receive a detailed PDF on your email within minutes of payment." },
              { q: "Is this different from a regular aptitude test?", a: "Yes, significantly. Pathfinder uses a psychological profiling model validated by IIM professors, counsellors, and thousands of student outcomes — not a generic multiple-choice aptitude test." },
              { q: "Can parents take the assessment on behalf of their child?", a: "We strongly recommend the student takes the assessment themselves for authentic results. However, parents are encouraged to review the report together with their child." }
            ].map((faq, idx) => (
              <div key={idx} className={`faq-item ${openFaqIndex === idx ? 'open' : ''}`}>
                <div className="faq-q" onClick={() => toggleFaq(idx)}>
                  {faq.q}
                  <div className="faq-icon">+</div>
                </div>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div className="final-cta">
        <span className="section-tag">Start today</span>
        <h2 className="section-title">Your career story starts with one honest conversation</h2>
        <p className="section-body">Take the assessment today and walk away with a clear, personalised direction — for just ₹499.</p>
        <div className="final-actions">
          <button onClick={handleStart} className="btn-primary-new">
            Get My Personalised Report
            <span className="btn-arrow">→</span>
          </button>
          <span className="price-note">Instant delivery · One-time ₹499 · 2,00,000+ students trust Pathfinder</span>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-logo">appli <span>·</span> Pathfinder</div>
        <div>© 2025 Appli. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
