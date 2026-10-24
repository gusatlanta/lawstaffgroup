"""Build the city and practice-area landing pages for LawStaffGroup.net.

SEO_PAGES_v1 (Gus 10-24: "seo the page for different cities and practice areas for
both ChatGPT and Claude"). Writes:

  locations/index.html + locations/<city>.html            (one page per city below)
  practice-areas/index.html + practice-areas/<area>.html  (one page per practice area)
  sitemap.xml                                             (all pages)
  llms.txt                                                (the generated block)
  index.html                                              (the seo-links block)
  FAQPage JSON-LD on index.html, hire.html and join.html  (from their visible FAQs)

Every page is plain static HTML (no JavaScript needed to read it), opens with a
one-paragraph answer, and carries Service + FAQPage + BreadcrumbList structured data,
which is what search engines and AI assistants (ChatGPT, Claude, Perplexity, Gemini)
read and quote. Nav and footer are copied from index.html so they never drift.

City x practice-area combinations are deliberately NOT generated: hundreds of
near-identical pages read as doorway pages to Google. Add a city or practice area by
adding an entry below, then run from the site root:

    python tools/build_seo_pages.py
"""
import html
import json
import re
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
BASE = "https://www.lawstaffgroup.net"
ORG = {"@type": "EmploymentAgency", "@id": BASE + "/#organization", "name": "LawStaff Group", "url": BASE}
UPDATED = date.today()
IMG = {
    "desk": "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1600&q=80",
    "pen": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80",
    "scales": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=80",
    "office": "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    "books": "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=1600&q=80",
}

# ── Cities ─────────────────────────────────────────────────────────────────────
# notes: issues local businesses commonly bring to counsel. Keep them general and
# accurate — they are shown as information, not legal advice.
CITIES = [
    dict(slug="atlanta", city="Atlanta", state="Georgia", st="GA",
         areas="Midtown, Buckhead, Alpharetta, Perimeter Center and the wider metro",
         industries=["Fintech & payments", "Logistics & supply chain", "Health care & health IT", "Media & entertainment", "Corporate headquarters"],
         angle="Atlanta is one of the country's busiest corporate and fintech hubs, home to payments companies, Fortune 500 headquarters and a fast-growing startup scene in Midtown and Alpharetta. Growing companies here often need GC-level judgment on payments, vendor and customer contracts, and multi-state employment issues long before they're ready to hire a full-time general counsel. LawStaff Group is headquartered in Alpharetta, so Atlanta is home turf.",
         notes=["Non-compete and non-solicit agreements under Georgia's Restrictive Covenants Act",
                "Payments, money-transmission and fintech partner agreements",
                "Employment policies and handbooks for teams in Georgia and other states",
                "Commercial leases and vendor contracts for growing Atlanta-area offices"],
         img="desk"),
    dict(slug="new-york", city="New York", state="New York", st="NY",
         areas="Manhattan, Brooklyn, Long Island, Westchester and northern New Jersey",
         industries=["Financial services", "Media & advertising", "Fashion & consumer brands", "Real estate", "Tech & fintech"],
         angle="New York's mix of financial services, media, consumer brands and venture-backed startups creates steady demand for experienced business counsel. Many companies here need sophisticated commercial, employment and regulatory advice without the cost of a full in-house team or big-firm billing on routine work.",
         notes=["Data-security obligations under New York's SHIELD Act",
                "New York City's pay-transparency rules for job postings",
                "NYC Local Law 144 on automated employment decision tools for companies using AI in hiring",
                "Commercial leases and vendor agreements in a high-cost market"],
         img="office"),
    dict(slug="los-angeles", city="Los Angeles", state="California", st="CA",
         areas="Downtown, Century City, Santa Monica, Burbank and Orange County",
         industries=["Entertainment & media", "Consumer & e-commerce brands", "Aerospace", "Real estate", "Health care"],
         angle="Los Angeles runs on entertainment, media, consumer brands and a growing tech scene from Santa Monica to downtown. Companies here juggle talent and production agreements, influencer and advertising deals, and California's demanding employment and privacy rules.",
         notes=["Privacy compliance under the CCPA, as amended by the CPRA",
                "California wage-and-hour rules, including meal and rest breaks and PAGA exposure",
                "California's general ban on employee non-compete agreements",
                "Talent, production, licensing and influencer agreements"],
         img="pen"),
    dict(slug="san-francisco", city="San Francisco Bay Area", short="the Bay Area", the=True, state="California", st="CA",
         areas="San Francisco, Oakland, Palo Alto, San Jose and the Peninsula",
         industries=["SaaS & software", "AI & machine learning", "Venture capital", "Biotech", "Fintech"],
         angle="The Bay Area is the center of the venture-backed startup world, and most startups don't need a full-time general counsel until well after their Series A. Fractional counsel gives founders senior judgment on financings, SaaS contracts, equity and privacy at the stage they actually need it.",
         notes=["Venture financings, SAFEs and equity compensation",
                "SaaS customer terms, data processing agreements and AI product terms",
                "Privacy compliance under the CCPA, as amended by the CPRA",
                "California's general ban on employee non-compete agreements"],
         img="office"),
    dict(slug="chicago", city="Chicago", state="Illinois", st="IL",
         areas="the Loop, River North, Fulton Market and the suburbs",
         industries=["Manufacturing & industrial", "Trading & financial services", "Food & consumer goods", "Logistics", "Health care"],
         angle="Chicago's economy spans manufacturing, trading, food and consumer goods, logistics and a growing tech scene in Fulton Market. Mid-sized companies here often need a steady hand on supply, distribution and employment matters without carrying a full legal department.",
         notes=["Biometric privacy compliance under Illinois's Biometric Information Privacy Act (BIPA)",
                "Non-compete limits under the Illinois Freedom to Work Act",
                "Supply, distribution and manufacturing agreements",
                "Employment policies for Illinois and multi-state workforces"],
         img="books"),
    dict(slug="dallas", city="Dallas–Fort Worth", short="Dallas–Fort Worth", state="Texas", st="TX",
         areas="Dallas, Fort Worth, Plano, Frisco, Irving and Las Colinas",
         industries=["Corporate headquarters", "Financial services", "Real estate", "Telecom & tech", "Energy"],
         angle="Dallas–Fort Worth has become a leading destination for corporate relocations, with headquarters, financial services firms and fast-growing private companies across Plano, Frisco and Irving. Many of them need experienced counsel to support growth, acquisitions and multi-state operations.",
         notes=["Texas Data Privacy and Security Act compliance",
                "Entity and governance matters under the Texas Business Organizations Code",
                "Commercial dispute strategy, including the Texas Business Court",
                "Acquisitions and integration for growing private companies"],
         img="desk"),
    dict(slug="houston", city="Houston", state="Texas", st="TX",
         areas="Downtown, the Energy Corridor, the Galleria, The Woodlands and Sugar Land",
         industries=["Oil & gas", "Energy transition & renewables", "Petrochemicals", "Health care & life sciences", "Ports & logistics"],
         angle="Houston is widely known as the energy capital of the U.S., with oil and gas, renewables, petrochemicals and the Texas Medical Center driving demand for specialized commercial counsel. Fractional counsel is a natural fit for project-heavy work that ebbs and flows.",
         notes=["Oil and gas, midstream and master service agreements",
                "Renewables and energy-transition project contracts",
                "Texas Data Privacy and Security Act compliance",
                "Health care and life-sciences agreements around the Texas Medical Center"],
         img="scales"),
    dict(slug="austin", city="Austin", state="Texas", st="TX",
         areas="Downtown, the Domain, Round Rock and the Hill Country",
         industries=["SaaS & software", "Semiconductors", "Consumer tech", "Clean energy", "Media & events"],
         angle="Austin's tech boom brought software companies, semiconductor manufacturing and a steady stream of startups. Companies here often scale headcount and contracts quickly and need senior legal judgment on SaaS terms, equity and employment before a full-time general counsel makes sense.",
         notes=["SaaS agreements, data processing terms and AI product terms",
                "Venture financings and equity compensation for startups",
                "Texas Data Privacy and Security Act compliance",
                "Employment policies for fast-growing, often remote teams"],
         img="office"),
    dict(slug="miami", city="Miami", state="Florida", st="FL",
         areas="Brickell, Downtown, Coral Gables, Fort Lauderdale and Boca Raton",
         industries=["International trade", "Real estate & hospitality", "Fintech & digital assets", "Latin America business", "Health care"],
         angle="Miami is a gateway to Latin America and a magnet for relocating companies, investors and fintech firms. Businesses here regularly deal with cross-border contracts, real estate and hospitality matters, and fast-moving financial technology.",
         notes=["Cross-border agreements with Latin American partners and distributors",
                "Real estate, hospitality and development contracts",
                "Fintech and digital-asset regulatory questions",
                "Employment policies for teams relocating to Florida"],
         img="pen"),
    dict(slug="boston", city="Boston", state="Massachusetts", st="MA",
         areas="Downtown, the Seaport, Kendall Square, Cambridge and Route 128",
         industries=["Biotech & life sciences", "Higher education", "Health care", "Robotics & deep tech", "Financial services"],
         angle="Boston and Cambridge are home to one of the world's densest life-sciences clusters, alongside universities, hospitals and deep-tech startups. Companies here need counsel comfortable with licensing, research collaborations and regulated industries.",
         notes=["License, sponsored-research and clinical trial agreements",
                "Non-compete rules under the Massachusetts Noncompetition Agreement Act",
                "Data-security requirements under Massachusetts regulations (201 CMR 17.00)",
                "Venture financings for life-sciences and deep-tech startups"],
         img="books"),
    dict(slug="washington-dc", city="Washington, D.C.", short="the D.C. region", state="District of Columbia", st="DC",
         areas="the District, Northern Virginia and suburban Maryland",
         industries=["Government contracting", "Associations & nonprofits", "Defense & aerospace", "Policy & advocacy", "Technology"],
         angle="The Washington region revolves around the federal government, which makes government contracts, regulatory work and nonprofit governance everyday needs. Contractors and associations often need experienced counsel part-time rather than a full legal department.",
         notes=["Federal government contracts under the FAR and DFARS",
                "Regulatory and compliance matters before federal agencies",
                "Nonprofit and association governance",
                "D.C.'s limits on employee non-compete agreements"],
         img="scales"),
    dict(slug="seattle", city="Seattle", state="Washington", st="WA",
         areas="Downtown, South Lake Union, Bellevue, Redmond and Tacoma",
         industries=["Cloud & software", "E-commerce", "Aerospace", "Biotech & global health", "Maritime & logistics"],
         angle="Seattle's economy is anchored by cloud computing, e-commerce, aerospace and global health, with a deep bench of startups founded by big-tech alumni. Companies here need counsel fluent in technology transactions and Washington's distinctive privacy and employment rules.",
         notes=["Health-data privacy under Washington's My Health My Data Act",
                "Washington's non-compete statute and its pay thresholds",
                "Cloud, SaaS and technology transaction agreements",
                "Venture financings and equity for big-tech spinouts"],
         img="office"),
    dict(slug="denver", city="Denver", state="Colorado", st="CO",
         areas="Downtown, LoDo, the Denver Tech Center, Boulder and Colorado Springs",
         industries=["Energy & natural resources", "Aerospace", "SaaS & software", "Outdoor & consumer brands", "Health care"],
         angle="Denver and Boulder blend energy, aerospace, software and outdoor brands, with many companies relocating to the Front Range. Growing businesses here need counsel who can keep up with Colorado's evolving privacy and employment laws.",
         notes=["Colorado Privacy Act compliance",
                "Colorado's non-compete law, including its notice requirements and pay thresholds",
                "Energy, natural-resources and aerospace supply agreements",
                "SaaS and technology agreements for Front Range startups"],
         img="desk"),
    dict(slug="charlotte", city="Charlotte", state="North Carolina", st="NC",
         areas="Uptown, South End, SouthPark, Ballantyne and the surrounding region",
         industries=["Banking & financial services", "Fintech", "Energy & utilities", "Manufacturing", "Motorsports"],
         angle="Charlotte is one of the largest banking centers in the U.S., with a growing fintech scene and strong energy, manufacturing and logistics sectors. Companies that sell to banks need counsel who understand vendor risk, financial regulation and long contract cycles.",
         notes=["Vendor and third-party risk agreements with banks and financial institutions",
                "Fintech partnership and banking-as-a-service agreements",
                "Energy, utility and manufacturing supply contracts",
                "Employment policies for North Carolina and multi-state teams"],
         img="books"),
    dict(slug="nashville", city="Nashville", state="Tennessee", st="TN",
         areas="Downtown, the Gulch, Music Row, Brentwood and Franklin",
         industries=["Health care services", "Music & entertainment", "Hospitality & tourism", "Automotive & manufacturing", "Health IT"],
         angle="Nashville is a national hub for health care services companies, alongside music, hospitality and a booming relocation scene in Brentwood and Franklin. Health care operators and their vendors need counsel who know regulated work.",
         notes=["Health care regulatory, fraud-and-abuse and HIPAA questions",
                "Provider, payer and health IT vendor agreements",
                "Music, entertainment and hospitality contracts",
                "Tennessee Information Protection Act compliance"],
         img="pen"),
    dict(slug="phoenix", city="Phoenix", state="Arizona", st="AZ",
         areas="Phoenix, Scottsdale, Tempe, Chandler and Mesa",
         industries=["Semiconductors & advanced manufacturing", "Real estate & construction", "Health care", "Financial services", "Tourism"],
         angle="Greater Phoenix is one of the country's fastest-growing metros, fueled by semiconductor plants, advanced manufacturing, real estate development and health care. Growing companies here need counsel for supply chains, construction and rapid hiring.",
         notes=["Supply and manufacturing agreements for the semiconductor buildout",
                "Real estate development and construction contracts",
                "Employment policies for fast-growing workforces",
                "Health care operations and vendor agreements"],
         img="desk"),
]

# ── Practice areas ─────────────────────────────────────────────────────────────
PRACTICES = [
    dict(slug="fractional-general-counsel", name="Fractional General Counsel", h1="Fractional <em>General Counsel</em>",
         title="Fractional General Counsel (Part-Time GC)", img="desk",
         blurb="A senior lawyer in your GC seat part-time: contracts, risk, the board and outside counsel.",
         intro="A fractional general counsel is an experienced lawyer who serves as your company's GC on a part-time basis: setting legal priorities, handling day-to-day contracts and risk, advising leadership and the board, and managing outside counsel when you need specialists.",
         handles=["Commercial contract review and negotiation", "Legal risk assessment and priorities", "Board and governance support",
                  "Employment questions and policies", "Managing outside counsel and legal spend", "Financings, acquisitions and other major transactions",
                  "Compliance programs and policies", "Contract templates and playbooks"],
         triggers=["You're paying outside counsel for routine work", "Contracts are slowing down sales or vendors",
                   "You're raising capital or preparing for an acquisition", "Your board or investors want legal oversight"],
         support="Pair your fractional GC with a part-time paralegal or contract administrator to keep volume moving.",
         faq=[("What does a fractional general counsel do?", "A fractional general counsel does what an in-house GC does (contracts, risk management, board and governance support, employment questions and managing outside counsel) for a set number of hours per week or month instead of full time."),
              ("When should a company hire a fractional GC instead of a full-time GC?", "When legal work is steady but not a full-time job, or when you need senior judgment before you can justify a full-time salary. Many growing companies use a fractional GC from early growth through the point where in-house legal volume supports a full-time hire."),
              ("How many hours does a fractional general counsel work?", "It depends on your needs: anywhere from a few hours a week to several days a week. You set the hours with your counsel and can adjust them as your workload changes.")]),
    dict(slug="commercial-contracts", name="Commercial Contracts", title="Fractional Commercial Contracts Counsel", img="pen",
         blurb="Customer, vendor and partner agreements, templates and playbooks, so deals close faster.",
         intro="Fractional commercial contracts counsel reviews, negotiates and templates the agreements your business runs on (customer, vendor, partner and services contracts), so deals close faster with less risk.",
         handles=["Customer and sales agreements", "Vendor, procurement and services agreements", "Master services agreements and statements of work",
                  "NDAs, partnership and reseller agreements", "Contract templates, playbooks and approval workflows", "Negotiation support for sales and procurement"],
         triggers=["Sales deals are waiting on legal review", "You don't have standard templates or a playbook",
                   "You're signing whatever paper vendors send", "Contract volume spiked with growth"],
         support="Add a fractional contract administrator for intake, tracking, signatures and renewals, working under counsel's direction.",
         faq=[("Can a fractional lawyer handle our contract volume?", "Yes. Hours scale with volume, and pairing counsel with templates, a playbook and a contract administrator lets one fractional lawyer handle far more agreements."),
              ("What's the difference between contracts counsel and a contract administrator?", "Contracts counsel gives legal advice, negotiates and approves terms. A contract administrator runs intake, tracking, signatures and renewals under counsel's direction and does not give legal advice."),
              ("Do you build contract templates and playbooks?", "Yes. Building standard templates and a negotiation playbook is one of the most common first projects for fractional contracts counsel.")]),
    dict(slug="employment-labor", name="Employment & Labor", title="Fractional Employment Counsel", img="office",
         blurb="Hiring, handbooks, classification, terminations and multi-state compliance.",
         intro="Fractional employment counsel keeps your people practices compliant as you grow: hiring, policies, worker classification, leave, terminations and multi-state rules.",
         handles=["Offer letters and employment agreements", "Handbooks and workplace policies", "Employee versus contractor classification",
                  "Multi-state employment compliance", "Non-competes, non-solicits and confidentiality agreements", "Terminations, severance and separation agreements",
                  "Workplace investigations", "Executive compensation and equity questions"],
         triggers=["You're hiring in new states", "Your handbook is out of date", "A difficult termination or employee complaint",
                   "You rely heavily on contractors"],
         support="A part-time paralegal can keep policies, acknowledgments and investigation files organized.",
         faq=[("Can fractional counsel handle employment issues in multiple states?", "Yes. Employment law varies widely by state, so we match you with counsel experienced in the states where your people work."),
              ("Do you help with non-compete agreements?", "Yes. Non-compete rules differ sharply by state: California generally bans them, and several states limit them by pay level. Your counsel will tailor agreements to each state."),
              ("Can a fractional lawyer conduct a workplace investigation?", "Yes. Many fractional employment lawyers conduct or oversee internal investigations and can recommend outside investigators when independence calls for it.")]),
    dict(slug="privacy-data-protection", name="Privacy & Data Protection", title="Fractional Privacy Counsel", img="books",
         blurb="Privacy programs, GDPR and U.S. state privacy laws, vendor terms and AI governance.",
         intro="Fractional privacy counsel builds and runs a privacy program sized to your business: data mapping, policies, vendor terms and compliance with laws like the GDPR and U.S. state privacy laws.",
         handles=["Privacy policies and notices", "Data mapping and privacy program build-out", "Data processing agreements and vendor terms",
                  "GDPR and U.S. state privacy law compliance", "HIPAA questions for health data", "Incident response planning and breach response",
                  "AI governance and responsible-use policies", "Privacy reviews before fundraising or an acquisition"],
         triggers=["You're expanding to Europe or new U.S. states", "Enterprise customers send privacy and security questionnaires",
                   "You're launching AI features", "You've had a data incident"],
         support="A contract administrator can track data processing agreements and vendor reviews.",
         faq=[("Do we need a full-time privacy officer?", "Not usually at first. Many companies use fractional privacy counsel to build the program and then keep a few hours a month for updates, vendor reviews and questions."),
              ("What's included in a privacy program build?", "Typically a data map, updated privacy notices, internal policies, a vendor and data processing agreement process, an incident response plan and training, prioritized by your risk."),
              ("Can fractional counsel help with security questionnaires?", "Yes. Counsel can answer the legal and privacy portions, prepare standard responses and work with your security team on the technical sections.")]),
    dict(slug="venture-capital-startups", name="Startups & Venture Capital", title="Fractional Startup &amp; Venture Counsel", img="office",
         blurb="Formation, SAFEs and priced rounds, equity, governance and early contracts.",
         intro="Fractional startup counsel gives founders senior legal judgment from formation through Series A and beyond: entity setup, financings, equity, governance and the commercial contracts that come with growth.",
         handles=["Entity formation and founder agreements", "SAFEs, convertible notes and priced rounds", "Cap tables and equity compensation plans",
                  "Board consents and governance", "Investor due diligence preparation", "Customer and commercial contracts", "Advisor and contractor agreements"],
         triggers=["You're raising a round", "You're hiring your first employees and granting options", "You're forming a board",
                   "Formation documents need clean-up before diligence"],
         support="A corporate paralegal can maintain the minute book, cap table records and filings.",
         faq=[("When does a startup need a general counsel?", "Usually earlier than founders expect: around a first priced round, first hires or first enterprise customers. A fractional GC covers that stage without a full-time salary."),
              ("Can fractional counsel lead our financing?", "Yes, for many seed and early-stage rounds. For larger or complex financings, fractional counsel often works alongside deal counsel and keeps costs in check."),
              ("Is fractional counsel cheaper than a law firm?", "For ongoing work it is usually more predictable: you pay for set hours with one lawyer who knows your company, instead of matter-by-matter billing.")]),
    dict(slug="mergers-acquisitions", name="Mergers & Acquisitions (M&A)", title="Fractional M&amp;A Counsel", img="scales",
         blurb="Sell-side prep, buy-side diligence, deal terms and post-merger integration.",
         intro="Fractional M&A counsel supports buy-side and sell-side deals: preparing the company, running diligence, negotiating key terms, coordinating outside deal counsel and handling integration after closing.",
         handles=["Sell-side preparation and data rooms", "Buy-side due diligence", "Letters of intent and key-term negotiation",
                  "Purchase agreements alongside deal counsel", "Disclosure schedules", "Post-merger integration of contracts, people and policies",
                  "Coordinating outside specialists"],
         triggers=["You're preparing to sell", "You're acquiring a competitor or a tuck-in", "You received an unsolicited offer",
                   "You're integrating an acquisition"],
         support="Corporate paralegals can run the data room and diligence tracking.",
         faq=[("Can a fractional lawyer run an acquisition?", "For smaller deals, yes. For larger deals, fractional counsel usually works alongside outside deal counsel, managing the process, the business-side diligence and the budget."),
              ("How does fractional counsel help with due diligence?", "By organizing the data room, reviewing material contracts, flagging risks early and coordinating specialist reviews such as tax, IP and employment."),
              ("What happens after closing?", "Integration: assigning or renegotiating contracts, aligning employment terms and policies, and folding the acquired company into your compliance programs.")]),
    dict(slug="intellectual-property", name="Intellectual Property", title="Fractional IP Counsel", img="books",
         blurb="Trademarks, copyrights, trade secrets and IP licensing.",
         intro="Fractional IP counsel protects and commercializes what you've built (trademarks, copyrights, trade secrets and IP licensing) and coordinates patent specialists when you need them.",
         handles=["Trademark clearance, filing and portfolio management", "Copyright and content licensing", "Trade secret protection and confidentiality programs",
                  "IP assignment and invention agreements", "IP licensing in and out", "Brand protection and enforcement letters",
                  "Coordinating patent work with registered patent practitioners"],
         triggers=["You're launching a new brand or product", "You're licensing your technology or content",
                   "Employees or contractors haven't signed IP assignments", "You have infringement concerns"],
         support="A paralegal can manage trademark docketing and renewal deadlines.",
         faq=[("Can fractional counsel file trademarks?", "Yes. Fractional IP counsel can run clearance searches, file applications and manage your trademark portfolio."),
              ("Do I need a patent attorney?", "Patent prosecution before the USPTO requires a registered patent attorney or agent. We can match you with one, and your fractional counsel can coordinate."),
              ("How do we protect trade secrets?", "With confidentiality agreements, IP assignment agreements, access controls and a clear policy, which fractional counsel can put in place quickly.")]),
    dict(slug="technology-saas", name="Technology & SaaS", title="Fractional Technology &amp; SaaS Counsel", img="office",
         blurb="SaaS terms, enterprise deals, licensing, open source and AI terms.",
         intro="Fractional technology counsel handles the agreements and issues software businesses face every day: SaaS terms, enterprise negotiations, licensing, data, open source and AI.",
         handles=["SaaS subscription agreements and order forms", "Enterprise customer negotiations", "Software licensing and reseller agreements",
                  "Data processing agreements and security terms", "Open-source compliance", "AI product terms and AI vendor reviews",
                  "Website terms of use and privacy policies"],
         triggers=["Enterprise deals are stuck in legal review", "You're launching AI features", "You're moving upmarket",
                   "Your customer paper is inconsistent"],
         support="A contract administrator can run order-form intake and renewal tracking.",
         faq=[("Can fractional counsel negotiate enterprise SaaS deals?", "Yes. Enterprise negotiation is one of the most common reasons SaaS companies bring in fractional counsel, often with a fallback-position playbook for the sales team."),
              ("Do you help with AI terms and policies?", "Yes. Counsel can draft AI product terms, review AI vendors and set internal responsible-use policies."),
              ("What about open source?", "Fractional counsel can set an open-source policy, review license obligations and prepare for diligence questions about open-source use.")]),
    dict(slug="healthcare-life-sciences", name="Healthcare & Life Sciences", title="Fractional Healthcare &amp; Life Sciences Counsel", img="scales",
         blurb="HIPAA, fraud and abuse, provider and payer agreements, FDA questions.",
         intro="Fractional healthcare counsel helps providers, health tech companies and life-sciences businesses work through regulated territory: HIPAA, fraud and abuse laws, provider and payer agreements, and FDA questions.",
         handles=["HIPAA privacy and business associate agreements", "Fraud and abuse questions (Anti-Kickback Statute, Stark Law)",
                  "Provider, payer and vendor agreements", "Telehealth and multi-state practice questions", "FDA regulatory questions for products and software",
                  "Clinical trial and research agreements", "Health care transactions and diligence"],
         triggers=["You're launching a health tech product", "You're contracting with providers or payers",
                   "You're expanding telehealth to new states", "You face diligence or a financing"],
         support="A paralegal can manage provider contract files, credentialing documents and BAA tracking.",
         faq=[("Does a health tech startup need healthcare counsel?", "Usually yes, early. Data, reimbursement and fraud-and-abuse rules shape the business model, and fixing them later is expensive."),
              ("Can fractional counsel review business associate agreements?", "Yes. Reviewing and standardizing business associate agreements is routine work for fractional healthcare counsel."),
              ("Do you have FDA regulatory counsel?", "We match you with counsel experienced in FDA regulatory work for your product type, including software as a medical device.")]),
    dict(slug="real-estate", name="Real Estate", title="Fractional Real Estate Counsel", img="desk",
         blurb="Leases, acquisitions, development, financing and closings.",
         intro="Fractional real estate counsel supports companies and investors with leases, acquisitions, development and financing, without a full-time real estate legal department.",
         handles=["Commercial lease negotiation for tenants and landlords", "Acquisitions and dispositions", "Development and construction contracts",
                  "Real estate financing", "Land use and zoning questions", "Lease portfolio administration", "Closing support with real estate paralegals"],
         triggers=["You're opening new locations", "Leases are renewing across a portfolio", "You have a development project",
                   "You're buying or selling property"],
         support="Real estate paralegals handle closings, title review coordination and lease abstracts.",
         faq=[("Can fractional counsel handle a multi-site lease portfolio?", "Yes. Many companies use fractional real estate counsel to standardize lease positions and manage renewals across locations, often with a paralegal abstracting leases."),
              ("Do you provide real estate paralegals?", "Yes. We place real estate and closing paralegals part-time, for a project or alongside fractional counsel."),
              ("Do you work on construction contracts?", "Yes. Fractional counsel can negotiate construction and development agreements and coordinate with construction specialists for disputes.")]),
    dict(slug="compliance-regulatory", name="Compliance & Regulatory", title="Fractional Compliance &amp; Regulatory Counsel", img="books",
         blurb="Compliance programs, anti-corruption, sanctions, AML and investigations.",
         intro="Fractional compliance counsel designs and runs compliance programs sized to your risk: policies, training, investigations and relationships with regulators.",
         handles=["Compliance program design and risk assessments", "Codes of conduct and policies", "Anti-corruption (FCPA), sanctions and export controls",
                  "AML and KYC programs for fintech", "Internal investigations", "Regulatory filings, licenses and examinations", "Training and board reporting"],
         triggers=["You're entering a regulated market", "You're selling internationally", "A regulator has made an inquiry",
                   "Investors or an acquirer are running diligence"],
         support="A compliance paralegal can manage training records, filings calendars and policy attestations.",
         faq=[("Do we need a chief compliance officer?", "Not always full time. A fractional compliance lawyer can build the program, serve as the point person and scale hours with your risk."),
              ("Can fractional counsel handle a regulatory exam?", "Yes. Counsel can prepare documents, manage the exam process and coordinate responses, bringing in specialists where needed."),
              ("Do you cover export controls and sanctions?", "Yes. We match you with counsel experienced in export controls, sanctions screening and anti-corruption programs.")]),
]

TALENT = [
    ("Fractional General Counsel", "A senior lawyer in your GC seat part-time.", "../hire.html#fractional-gc"),
    ("Part-Time & Project Counsel", "Standing weekly hours, a defined project or interim coverage.", "../hire.html#part-time"),
    ("Paralegals", "Litigation, corporate, real estate and compliance paralegals.", "../hire.html#paralegals"),
    ("Contract Administrators & Legal Assistants", "Contract operations, calendaring, filings and admin support.", "../hire.html#contracts"),
]

STEPS = [
    ("Tell Us the Work", "The role, practice area, hours and jurisdiction you need."),
    ("Watch the Interviews", "We send matched professionals with their video interviews and rates."),
    ("Retain Your Pick", "Choose who fits and set the hours. Adjust them anytime."),
    ("One Invoice", "We bill you and run payroll, employer taxes and insurance."),
]


def e(text: str) -> str:
    return html.escape(text, quote=True)


def ld(obj) -> str:
    return '<script type="application/ld+json">\n' + json.dumps(obj, indent=2, ensure_ascii=False).replace("</", "<\\/") + "\n  </script>"


def chrome():
    """Nav + footer from index.html, with relative links pointed one folder up."""
    index = (SITE / "index.html").read_text(encoding="utf-8")
    nav = re.search(r'<nav class="navbar" id="navbar">.*?</nav>', index, re.S).group(0)
    footer = re.search(r"<footer>.*?</footer>", index, re.S).group(0)
    up = lambda block: re.sub(r'(href|src)="(?!https?:|mailto:|tel:|#|/|data:)', r'\1="../', block)
    return up(nav), up(footer)


NAV, FOOTER = chrome()


def faq_ld(faq):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]}


def crumbs_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, "item": url} for i, (name, url) in enumerate(items)]}


def page(*, path, title, desc, schema, crumbs, h1, hero_p, hero_ctas, img, body):
    url = f"{BASE}/{path}"
    crumb_html = '<a href="../index.html">Home</a><span>/</span>' + "<span>/</span>".join(
        f'<a href="{href}">{e(name)}</a>' if href else e(name) for name, href in crumbs)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/png" sizes="32x32" href="../img/favicon-32.png">
  <link rel="apple-touch-icon" href="../img/favicon-180.png">
  <title>{title}</title>
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-snippet:-1">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LawStaff Group">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{BASE}/img/lawstaff-logo.png">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#0b1f3d">
  {ld({"@context": "https://schema.org", "@graph": schema})}
  <link rel="stylesheet" href="../css/styles.css">
</head>
<body>

<!-- Generated by tools/build_seo_pages.py (SEO_PAGES_v1). Edit the script, not this file. -->
{NAV}

<section class="page-hero" style="background-image:url('{IMG[img]}');">
  <div class="container">
    <div class="breadcrumb">{crumb_html}</div>
    <h1>{h1}</h1>
    <p>{hero_p}</p>
    <div class="page-hero-ctas">{hero_ctas}</div>
    <p class="page-updated">Updated {UPDATED:%B %Y}</p>
  </div>
</section>
{body}
{FOOTER}

<script src="../js/main.js"></script>
</body>
</html>
"""


def faq_html(faq, heading):
    items = "\n".join(f"""      <details>
        <summary>{e(q)}</summary>
        <div class="faq-a">{e(a)}</div>
      </details>""" for q, a in faq)
    return f"""
<section class="section" aria-label="Frequently asked questions">
  <div class="container">
    <div class="centered">
      <span class="section-kicker">Common Questions</span>
      <h2 class="section-title">{heading}</h2>
    </div>
    <div class="faq">
{items}
    </div>
  </div>
</section>"""


def steps_html():
    return "\n".join(f"""      <div class="step">
        <div class="step-num">{i + 1}</div>
        <h4>{e(t)}</h4>
        <p>{e(d)}</p>
      </div>""" for i, (t, d) in enumerate(STEPS))


def chips(links):
    return "\n".join(f'      <a class="practice-chip" href="{href}">{e(name)}</a>' for name, href in links)


def cta_band(heading, text):
    return f"""
<div class="cta-band">
  <div class="container">
    <h2>{heading}</h2>
    <p>{text}</p>
    <div class="cta-actions">
      <a href="../hire.html#request" class="btn btn-white btn-lg">Request Talent</a>
      <a href="../apply.html" class="btn btn-outline-white btn-lg">Apply Now</a>
    </div>
  </div>
</div>"""


# ── City pages ─────────────────────────────────────────────────────────────────
def city_page(c):
    name, short = c["city"], c.get("short", c["city"])
    place = name if c["st"] == "DC" else f"{name}, {c['st']}"
    in_name = ("the " if c.get("the") else "") + name   # "in the San Francisco Bay Area"
    if c.get("the"):
        place = "the " + place
    faq = [
        (f"How do I hire a fractional general counsel in {short}?",
         f"Tell LawStaff Group what you need (practice area, hours per week and jurisdiction) and we send you matched, video-interviewed counsel with their rates. You retain the lawyer you choose, and we handle billing and payroll."),
        (f"Do fractional lawyers in {short} need to be licensed in {c['state']}?",
         f"For advice on {c['state']} law or appearances in {c['state']} courts, generally yes. Many states also let lawyers admitted elsewhere register as in-house counsel for a single employer, and the rules vary. We match you with counsel admitted where your work requires."),
        (f"Can I hire a part-time paralegal, contract administrator or legal assistant in {short}?",
         "Yes. We place video-interviewed paralegals, contract administrators and legal assistants part-time or for a project. They work under the direction of your attorneys or legal team."),
        (f"How much does fractional counsel cost in {short}?",
         "Each professional sets their own hourly rate, based on experience and practice area. You pay one all-in rate (their rate plus our platform fee) on one invoice, and we quote it for everyone we present. Our Legal Salary Guide shows what legal professionals are asking to be paid."),
        (f"Do I have to be in {short} to work with fractional counsel?",
         "No. Most fractional engagements are remote-first, with on-site time when the work calls for it."),
    ]
    title = f"Fractional General Counsel &amp; Legal Talent in {e(place)} | LawStaff Group"
    desc = (f"Hire fractional general counsel, part-time lawyers, paralegals, contract administrators and legal assistants in {place}. "
            "Video-interviewed talent, one invoice, payroll handled by LawStaff Group.")
    others = [(o["city"], f"{o['slug']}.html") for o in CITIES if o is not c]
    practice_links = [(p["name"], f"../practice-areas/{p['slug']}.html") for p in PRACTICES]
    talent = "\n".join(f"""      <a class="seo-card" href="{href}">
        <h3>{e(t)}</h3>
        <p>{e(d)}</p>
        <span class="svc-card-link">Learn more →</span>
      </a>""" for t, d, href in TALENT)
    body = f"""
<section class="section">
  <div class="container two-col" style="align-items:start;">
    <div class="prose">
      <span class="section-kicker">{e(short)}</span>
      <h2 class="section-title">Fractional Legal Help for <em>{e(short)} Businesses</em></h2>
      <div class="section-divider"></div>
      <p><strong style="color:var(--ink);">LawStaff Group connects businesses in {e(place)} with video-interviewed fractional general counsel, part-time in-house counsel, paralegals, contract administrators and legal assistants, and runs billing and payroll on every engagement.</strong></p>
      <p>{e(c['angle'])}</p>
      <p>Serving {e(c['areas'])}. Remote-first, with on-site help when you need it.</p>
      <div class="tags">
{chr(10).join(f'        <span class="tag">{e(i)}</span>' for i in c['industries'])}
      </div>
    </div>
    <div class="panel fee-panel">
      <span class="section-kicker">{e(c['state'])} Issues</span>
      <h3 style="font-size:1.2rem;margin-bottom:4px;">What {e(short)} Companies Bring to Fractional Counsel</h3>
      <ul class="check-list">
{chr(10).join(f'        <li>{e(n)}</li>' for n in c['notes'])}
      </ul>
      <p class="fee-note">General information, not legal advice. Your counsel will advise on your specific situation.</p>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <span class="section-kicker">Who You Can Retain</span>
    <h2 class="section-title">Fractional Legal Talent in <em>{e(short)}</em></h2>
    <div class="seo-grid">
{talent}
    </div>
    <h3 style="font-size:1.1rem;margin-top:44px;">Practice areas</h3>
    <div class="practice-chips practice-chips--left">
{chips(practice_links)}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <span class="section-kicker">How It Works</span>
    <h2 class="section-title">From Request to Retained Talent</h2>
    <div class="section-divider"></div>
    <p class="section-sub">Every professional has applied, recorded a video interview and had references checked, with bar admissions confirmed for attorneys. Each sets their own rate, and you pay one all-in rate on one invoice.</p>
    <div class="steps-row">
{steps_html()}
    </div>
  </div>
</section>
{faq_html(faq, f"Fractional Counsel in {e(short)}")}

<section class="section section-alt" style="padding:56px 0;">
  <div class="container">
    <span class="section-kicker">Other Cities</span>
    <h2 class="section-title" style="font-size:1.5rem;">Fractional Talent Across the U.S.</h2>
    <div class="practice-chips practice-chips--left">
{chips(others)}
      <a class="practice-chip" href="index.html">All locations</a>
    </div>
  </div>
</section>
{cta_band(f"Fractional Legal Talent<br>for {e(short)}", f"Tell us about the work. Lawyers and legal professionals in {e(short)} can apply to join the platform.")}"""
    schema = [
        crumbs_ld([("Home", BASE + "/"), ("Locations", BASE + "/locations/index.html"), (name, f"{BASE}/locations/{c['slug']}.html")]),
        {"@type": "Service", "name": f"Fractional counsel and legal talent in {place}", "url": f"{BASE}/locations/{c['slug']}.html",
         "serviceType": ["Fractional general counsel", "Part-time in-house counsel", "Fractional paralegals", "Contract administrators", "Legal assistants"],
         "provider": ORG, "description": desc,
         "areaServed": {"@type": "City", "name": name, "containedInPlace": {"@type": "State", "name": c["state"]}}},
        faq_ld(faq),
    ]
    hero_ctas = (f'<a href="../hire.html#request" class="btn btn-white btn-lg">Request Talent →</a>'
                 f'<a href="../apply.html" class="btn btn-outline-white btn-lg">Lawyers &amp; Paralegals: Apply</a>')
    return page(path=f"locations/{c['slug']}.html", title=title, desc=desc, schema=schema,
                crumbs=[("Locations", "index.html"), (name, None)],
                h1=f"Fractional Counsel &amp; Legal Talent in <em>{e(in_name)}</em>",
                hero_p=f"Video-interviewed fractional general counsel, part-time lawyers, paralegals, contract administrators and legal assistants for {e(short)} businesses. One invoice. Payroll handled.",
                hero_ctas=hero_ctas, img=c["img"], body=body)


# ── Practice-area pages ────────────────────────────────────────────────────────
def practice_page(p):
    name = p["name"]
    h1 = p.get("h1", f"Fractional <em>{e(name)}</em> Counsel")
    title = f"{p['title']} | Part-Time Lawyers | LawStaff Group"
    desc = f"{html.unescape(p['title'])}: {p['blurb']} Video-interviewed lawyers by the hour, week or month. One invoice, payroll handled by LawStaff Group."
    cities = [(c["city"], f"../locations/{c['slug']}.html") for c in CITIES]
    others = [(o["name"], f"{o['slug']}.html") for o in PRACTICES if o is not p]
    triggers = "\n".join(f"""      <div class="diff-item">
        <div class="diff-icon"><svg class="ico" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <div><h4>{e(t)}</h4></div>
      </div>""" for t in p["triggers"])
    body = f"""
<section class="section">
  <div class="container two-col" style="align-items:start;">
    <div class="prose">
      <span class="section-kicker">{e(name)}</span>
      <h2 class="section-title">What Fractional {e(name)} Counsel <em>Does</em></h2>
      <div class="section-divider"></div>
      <p><strong style="color:var(--ink);">{e(p['intro'])}</strong></p>
      <p>Through LawStaff Group you retain experienced, video-interviewed counsel for the hours you need, from a few hours a month to several days a week. We run billing and payroll on every engagement, so your counsel just practices law.</p>
      <p>{e(p['support'])}</p>
    </div>
    <div class="panel fee-panel">
      <span class="section-kicker">Typical Work</span>
      <h3 style="font-size:1.2rem;margin-bottom:4px;">What They Handle</h3>
      <ul class="check-list">
{chr(10).join(f'        <li>{e(h)}</li>' for h in p['handles'])}
      </ul>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <div class="centered">
      <span class="section-kicker">When to Bring Them In</span>
      <h2 class="section-title">Signs You Need Fractional {e(name)} Counsel</h2>
    </div>
    <div class="diff-grid">
{triggers}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <span class="section-kicker">How It Works</span>
    <h2 class="section-title">From Request to Retained Counsel</h2>
    <div class="section-divider"></div>
    <p class="section-sub">Every lawyer has applied, recorded a video interview, had bar admissions confirmed and references checked. Each sets their own rate, and you pay one all-in rate on one invoice.</p>
    <div class="steps-row">
{steps_html()}
    </div>
  </div>
</section>
{faq_html(p['faq'], f"Fractional {e(name)} Counsel")}

<section class="section section-alt" style="padding:56px 0;">
  <div class="container">
    <span class="section-kicker">Locations</span>
    <h2 class="section-title" style="font-size:1.5rem;">Fractional {e(name)} Counsel by City</h2>
    <p class="section-sub">Remote-first across the U.S., matched to the jurisdictions your work requires.</p>
    <div class="practice-chips practice-chips--left">
{chips(cities)}
    </div>
    <h3 style="font-size:1.1rem;margin-top:36px;">Other practice areas</h3>
    <div class="practice-chips practice-chips--left">
{chips(others)}
      <a class="practice-chip" href="index.html">All practice areas</a>
    </div>
  </div>
</section>
{cta_band(f"Retain Fractional<br>{e(name)} Counsel", "Tell us about the work, and we'll send you video-interviewed counsel who fit.")}"""
    schema = [
        crumbs_ld([("Home", BASE + "/"), ("Practice Areas", BASE + "/practice-areas/index.html"), (name, f"{BASE}/practice-areas/{p['slug']}.html")]),
        {"@type": "Service", "name": html.unescape(p["title"]), "url": f"{BASE}/practice-areas/{p['slug']}.html",
         "serviceType": html.unescape(p["title"]), "provider": ORG, "description": p["intro"],
         "areaServed": {"@type": "Country", "name": "United States"}},
        faq_ld(p["faq"]),
    ]
    hero_ctas = ('<a href="../hire.html#request" class="btn btn-white btn-lg">Request Counsel →</a>'
                 '<a href="../apply.html" class="btn btn-outline-white btn-lg">Lawyers: Apply</a>')
    return page(path=f"practice-areas/{p['slug']}.html", title=title, desc=desc, schema=schema,
                crumbs=[("Practice Areas", "index.html"), (name, None)], h1=h1,
                hero_p=e(p["blurb"]) + " Video-interviewed counsel by the hour, week or month.",
                hero_ctas=hero_ctas, img=p["img"], body=body)


# ── Hub pages ──────────────────────────────────────────────────────────────────
def hub_page(kind):
    if kind == "locations":
        cards = [(c["city"], f"{', '.join(c['industries'][:3])}.", f"{c['slug']}.html") for c in CITIES]
        title, h1 = "Fractional Counsel &amp; Legal Talent by City | LawStaff Group", "Fractional Legal Talent <em>by City</em>"
        desc = "Fractional general counsel, part-time lawyers, paralegals, contract administrators and legal assistants in Atlanta, New York, Los Angeles, the Bay Area, Chicago, Texas and more."
        intro = "LawStaff Group matches businesses with video-interviewed fractional counsel and legal support professionals across the U.S. Most engagements are remote-first, and every attorney is matched to the jurisdictions your work requires."
        kicker, path, crumb = "Locations", "locations/index.html", "Locations"
        footer_note = 'Don\'t see your city? We work remotely across the U.S. <a href="../hire.html#request" style="color:var(--blue);font-weight:600;">Tell us what you need →</a>'
    else:
        cards = [(p["name"], p["blurb"], f"{p['slug']}.html") for p in PRACTICES]
        title, h1 = "Fractional Counsel by Practice Area | LawStaff Group", "Fractional Counsel <em>by Practice Area</em>"
        desc = "Fractional general counsel and part-time lawyers for commercial contracts, employment, privacy, startups, M&A, IP, technology, healthcare, real estate and compliance."
        intro = "Retain experienced, video-interviewed counsel for the practice area you need, by the hour, week or month. LawStaff Group runs billing and payroll on every engagement."
        kicker, path, crumb = "Practice Areas", "practice-areas/index.html", "Practice Areas"
        footer_note = 'Need something else? <a href="../hire.html#request" style="color:var(--blue);font-weight:600;">Tell us about the work →</a>'
    grid = "\n".join(f"""      <a class="seo-card" href="{href}">
        <h3>{e(t)}</h3>
        <p>{e(d)}</p>
        <span class="svc-card-link">View page →</span>
      </a>""" for t, d, href in cards)
    body = f"""
<section class="section">
  <div class="container">
    <span class="section-kicker">{kicker}</span>
    <h2 class="section-title">{h1}</h2>
    <div class="section-divider"></div>
    <p class="section-sub">{intro}</p>
    <div class="seo-grid">
{grid}
    </div>
    <p class="section-sub" style="margin-top:32px;">{footer_note}</p>
  </div>
</section>
{cta_band("Hire Fractional Legal Talent,<br>or Join the Platform", "Tell us what your business needs, or apply to join the platform.")}"""
    schema = [
        crumbs_ld([("Home", BASE + "/"), (crumb, f"{BASE}/{path}")]),
        {"@type": "CollectionPage", "name": html.unescape(title), "url": f"{BASE}/{path}", "description": desc,
         "hasPart": [{"@type": "WebPage", "name": t, "url": f"{BASE}/{path.split('/')[0]}/{href}"} for t, _, href in cards]},
    ]
    return page(path=path, title=title, desc=desc, schema=schema, crumbs=[(crumb, None)], h1=h1, hero_p=e(intro),
                hero_ctas='<a href="../hire.html#request" class="btn btn-white btn-lg">Request Talent →</a>',
                img="books", body=body)


# ── Site-wide outputs ──────────────────────────────────────────────────────────
ROOT_PAGES = ["", "hire.html", "join.html", "apply.html", "services.html", "candidates.html",
              "salary-guide.html", "about.html", "contact.html"]


def generated_paths():
    return (["locations/index.html"] + [f"locations/{c['slug']}.html" for c in CITIES]
            + ["practice-areas/index.html"] + [f"practice-areas/{p['slug']}.html" for p in PRACTICES])


def write_sitemap():
    urls = "\n".join(f"  <url><loc>{BASE}/{p}</loc><lastmod>{UPDATED.isoformat()}</lastmod></url>"
                     for p in ROOT_PAGES + generated_paths())
    (SITE / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n',
        encoding="utf-8", newline="\n")


def replace_block(path, begin, end, content):
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pattern.search(text):
        raise SystemExit(f"{path.name}: markers not found ({begin!r})")
    path.write_text(pattern.sub(lambda _: begin + content + end, text), encoding="utf-8", newline="\n")


def write_llms():
    lines = ["", "## Fractional talent by city"]
    lines += [f"- {c['city']}: {BASE}/locations/{c['slug']}.html" for c in CITIES]
    lines += ["", "## Fractional counsel by practice area"]
    lines += [f"- {p['name']}: {BASE}/practice-areas/{p['slug']}.html ({p['blurb']})" for p in PRACTICES]
    path = SITE / "llms.txt"
    begin, end = "<!-- BEGIN generated by tools/build_seo_pages.py -->", "<!-- END generated -->"
    if begin not in path.read_text(encoding="utf-8"):
        path.write_text(path.read_text(encoding="utf-8").rstrip("\n") + f"\n\n{begin}\n{end}\n", encoding="utf-8", newline="\n")
    replace_block(path, begin, end, "\n".join(lines) + "\n")


def write_home_links():
    city_chips = chips([(c["city"], f"locations/{c['slug']}.html") for c in CITIES])
    practice_chips = chips([(p["name"], f"practice-areas/{p['slug']}.html") for p in PRACTICES])
    block = f"""
<section class="section" style="padding-top:0;">
  <div class="container">
    <div class="centered">
      <span class="section-kicker">Near You</span>
      <h2 class="section-title">Fractional Talent <em>by City and Practice</em></h2>
    </div>
    <div class="practice-chips">
{city_chips}
    </div>
    <div class="practice-chips" style="margin-top:14px;">
{practice_chips}
    </div>
  </div>
</section>
"""
    replace_block(SITE / "index.html", "<!-- BEGIN seo-links (generated by tools/build_seo_pages.py; edit the script, not this block) -->",
                  "<!-- END seo-links -->", block)


def write_faq_schema(name):
    """FAQPage JSON-LD built from the page's visible <details> FAQ, so the two never disagree."""
    path = SITE / name
    text = path.read_text(encoding="utf-8")
    pairs = re.findall(r'<details>\s*<summary>(.*?)</summary>\s*<div class="faq-a">(.*?)</div>\s*</details>', text, re.S)
    clean = lambda s: html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s))).strip()
    block = ld({"@context": "https://schema.org", **faq_ld([(clean(q), clean(a)) for q, a in pairs])})
    block = block.replace('<script type="application/ld+json">', '<script type="application/ld+json" id="faq-schema">', 1)
    text = re.sub(r'\n  <script type="application/ld\+json" id="faq-schema">.*?</script>', "", text, flags=re.S)
    text = text.replace('  <link rel="stylesheet" href="css/styles.css">', f'  {block}\n  <link rel="stylesheet" href="css/styles.css">', 1)
    path.write_text(text, encoding="utf-8", newline="\n")
    return len(pairs)


def main():
    for folder in ("locations", "practice-areas"):
        (SITE / folder).mkdir(exist_ok=True)
    out = {"locations/index.html": hub_page("locations"), "practice-areas/index.html": hub_page("practice")}
    out.update({f"locations/{c['slug']}.html": city_page(c) for c in CITIES})
    out.update({f"practice-areas/{p['slug']}.html": practice_page(p) for p in PRACTICES})
    for rel, content in out.items():
        (SITE / rel).write_text(content, encoding="utf-8", newline="\n")
    write_sitemap()
    write_llms()
    write_home_links()
    faqs = {n: write_faq_schema(n) for n in ("index.html", "hire.html", "join.html")}
    print(f"{len(out)} pages written ({len(CITIES)} cities, {len(PRACTICES)} practice areas, 2 hubs); "
          f"sitemap.xml, llms.txt, home links and FAQ schema updated {faqs}")


if __name__ == "__main__":
    main()
