import Foundation

// Mock SCORM Service for Development
class MockSCORMService {
    static let shared = MockSCORMService()
    private init() {}
    
    // Embedded HTML content for courses
    private let roofingCourseHTML = """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Module 1 — Roof Anatomy & Terminology</title>
      <style>
        :root { 
          color-scheme: light dark; 
          --primary-color: #2c5aa0;
          --secondary-color: #f4a261;
          --accent-color: #e76f51;
          --text-color: #264653;
          --bg-color: #f8f9fa;
          --card-bg: #ffffff;
          --border-color: #e9ecef;
        }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          margin: 0;
          padding: 24px;
          background-color: var(--bg-color);
          color: var(--text-color);
        }
        main { 
          max-width: 880px; 
          margin: auto;
          background: var(--card-bg);
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        }
        header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 { 
          font-size: 2.2rem; 
          margin-bottom: 0.5rem;
          font-weight: 700;
        }
        .lede { 
          color: rgba(255,255,255,0.9); 
          margin-top: 0;
          font-size: 1.1rem;
          font-weight: 400;
        }
        section { 
          margin: 2rem 0;
          padding: 25px;
          background: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid var(--primary-color);
        }
        h2 {
          color: var(--primary-color);
          margin-top: 0;
          font-size: 1.5rem;
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 10px;
        }
        ul, ol {
          margin: 15px 0;
          padding-left: 25px;
        }
        li {
          margin: 8px 0;
          line-height: 1.5;
        }
        p {
          margin: 15px 0;
          line-height: 1.6;
        }
        strong {
          color: var(--primary-color);
          font-weight: 600;
        }
        em {
          color: var(--secondary-color);
          font-style: italic;
          font-weight: 500;
        }
        .activity, .asset {
          background: #e3f2fd;
          border: 2px solid var(--primary-color);
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-style: italic;
          color: var(--primary-color);
        }
        button { 
          padding: 12px 20px; 
          border-radius: 8px; 
          border: 2px solid var(--primary-color);
          background: var(--primary-color);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 10px 5px;
        }
        button:hover {
          background: var(--secondary-color);
          border-color: var(--secondary-color);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .hidden { 
          display: none; 
        }
        .answers {
          background: #f0f8ff;
          border: 2px solid var(--primary-color);
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .answers p {
          margin: 10px 0;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .answers p:last-child {
          border-bottom: none;
        }
        .refs { 
          font-size: 0.9rem; 
          color: #666;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid var(--secondary-color);
          margin-top: 30px;
        }
        footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid var(--border-color);
        }
        @media (max-width: 768px) {
          body { padding: 15px; }
          main { padding: 20px; }
          h1 { font-size: 1.8rem; }
          section { padding: 20px; }
          button { display: block; width: 100%; margin: 10px 0; }
        }
      </style>
    </head>
    <body>
      <main>
        <header>
          <h1>Understanding Roof Systems — From Deck to Shingle</h1>
          <p class="lede">A practical, field‑oriented overview of how roofs are built, from structure to coverings and ventilation.</p>
        </header>

        <section id="objectives">
          <h2>Learning Objectives</h2>
          <ul>
            <li>Identify and describe major components of a roofing system.</li>
            <li>Explain the function of each material layer from framing to covering.</li>
            <li>Recognize common roof shapes and their construction/estimating implications.</li>
            <li>Use correct terminology in documentation and jobsite communication.</li>
          </ul>
        </section>

        <section id="structure">
          <h2>1) Roof Structure (Framing)</h2>
          <p><strong>Framing systems.</strong> <em>Rafters</em> are individual sloped members that bear on exterior walls and a ridge; they are laid out and cut on site, allowing flexible tie‑ins (e.g., dormers) but requiring careful sizing, bracing, and collar ties/rafter ties where required. <em>Trusses</em> are engineered assemblies fabricated off‑site; they speed installation, control deflection, and distribute loads through webs and chords. Trusses must not be cut in the field without an engineer's direction.</p>
          
          <p><strong>Common roof designs.</strong> <em>Gable</em> (two planes, ridge at peak), <em>hip</em> (planes on all sides meeting at hips), <em>shed</em> (single plane), <em>gambrel</em> (dual pitch per side), <em>mansard</em> (steep lower slope with flatter upper), and <em>flat/low‑slope</em>. Geometry affects the number of hips/valleys, waste factor, and flashing complexity.</p>
          
          <p><strong>Load transfer.</strong> Roofs carry <em>dead load</em> (materials), <em>live load</em> (workers, maintenance, snow), and <em>wind</em> (uplift/suction). Members transfer loads to bearing walls and foundations. Follow engineered drawings and local code; do not remove load‑bearing elements.</p>
          
          <p><strong>Decking materials.</strong> Typical sheathing is <em>OSB</em> or <em>plywood</em>; older structures may have <em>board/plank decking</em>. Replace decayed, delaminated, or undersized panels. Fasten per schedule; maintain panel spacing and blocking where required.</p>
          
          <div class="activity">
            <strong>Interactive idea:</strong> A 3D model with toggleable layers (framing → sheathing → underlayment → shingles) to visualize sequence.
            <br><br>
            <button onclick="window.webkit.messageHandlers.roof3d?.postMessage({action: 'open3d'})" style="background: #2c5aa0; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
              🏗️ Open 3D Roof Model
            </button>
          </div>
        </section>

        <section id="underlayment">
          <h2>2) Roof Deck & Underlayment</h2>
          <p><strong>Deck inspection & prep.</strong> Substrate must be clean, dry, and sound. Re‑nail loose panels, correct proud edges, and remove debris/fastener shanks. Prime metal edges if specified by the manufacturer.</p>
          
          <p><strong>Underlayment types.</strong> (a) <em>Asphalt‑saturated felt</em> (#15/#30) per common ASTM felts; (b) <em>synthetic</em> polymer underlayments with printed lap lines and cap‑nail patterns; (c) <em>ice‑barrier membranes</em> (self‑adhered) at eaves/valleys in cold climates and other critical areas.</p>
          
          <p><strong>Overlaps, fasteners, sequencing.</strong> Start at eaves and work upslope, shingle‑fashion. Typical felt laps: ~2″ side, ~4″ end on standard slopes (use larger laps on lower slopes as required). Synthetics specify their own lap and fastener schedules—follow printed lines and cap‑nail patterns. Install ice‑barrier from eaves upslope to at least the warm‑side wall line in snow regions (verify local requirements). Integrate drip edge correctly at eaves and rakes.</p>
          
          <p><strong>Key standards & code.</strong> Common felt and ice‑barrier products reference ASTM felt standards and self‑adhered membrane standards; cold‑weather ice‑barrier and general steep‑slope underlayment provisions appear in residential code sections for roof coverings. Always follow the <em>current</em> manufacturer instructions and local authority requirements.</p>
          
          <div class="asset">Visual: animation of underlayment roll‑out, lap zones, starter courses.</div>
        </section>

        <section id="flashings">
          <h2>3) Flashings & Penetrations</h2>
          <p><strong>Step vs. counter flashing.</strong> Step flashing is L‑shaped metal interleaved with each shingle course along a sidewall. Counter flashing anchors to the vertical surface and overlaps step flashing, directing water over it. Both are needed for durable sidewall and chimney details.</p>
          
          <p><strong>Roof edges.</strong> At <em>eaves</em>, drip edge typically goes <em>under</em> the underlayment to direct water into gutters; at <em>rakes</em>, drip edge typically goes <em>over</em> the underlayment to shield edges. Confirm local code and manufacturer details.</p>
          
          <p><strong>Penetrations.</strong> Use boot flashings matched to pipe OD; seat underlayment correctly; avoid face‑nailing through horizontal legs unless specified. For chimneys/skylights, use pan/step/counter sequences with upslope back‑pans and crickets where required.</p>
          
          <p><strong>Common leak points.</strong> Reverse laps; missing/short step flashing; face‑nailed counter flashing; reliance on sealant as primary waterproofing; no cricket behind wide chimneys.</p>
          
          <div class="activity">Interactive: "Find the leak" on a mis‑flashed chimney photo—tap hotspots to reveal corrections.</div>
        </section>

        <section id="coverings">
          <h2>4) Roof Coverings (Shingles & Alternatives)</h2>
          <p><strong>Asphalt shingles.</strong> Fiberglass mat with asphalt and mineral granules. Performance and wind resistance depend on correct nail count and placement through the nailing zone and on sealed adhesive strips. Maintain exposure and stagger per manufacturer pattern.</p>
          
          <p><strong>Other materials.</strong> Metal panels/shingles; clay/concrete tile; wood shakes/shingles; slate; polymer/synthetic products—each with specific deck, underlayment, fastening, weight, and slope requirements. Use manufacturer installation instructions for each system.</p>
          
          <p><strong>Details.</strong> Starter strip at eaves; field courses with proper offset; hips/ridges capped per system. Align with prevailing wind where applicable. Never over‑drive nails or place above/below the nailing zone.</p>
          
          <div class="asset">Visual: split‑screen install—left correct nailing, right common errors (high nailing, over‑driven nails, missed deck).</div>
        </section>

        <section id="ventilation">
          <h2>5) Ventilation & Moisture Control</h2>
          <p><strong>Balanced ventilation.</strong> Provide intake (soffit) and exhaust (ridge/gable) with roughly equal net free area (NFA) to promote continuous airflow. Keep baffles at eaves to maintain a clear path above insulation.</p>
          
          <p><strong>Moisture management.</strong> Control indoor air leakage, maintain continuous insulation, and position vapor control layers per climate zone and building design. In cold climates, combine air sealing, insulation, ventilation, and ice‑barrier membranes to mitigate ice dams.</p>
          
          <div class="activity">Interactive: animated airflow diagram showing intake at soffits and exhaust at ridge with seasonal heat/moisture flows.</div>
        </section>

        <section id="assessment">
          <h2>6) Review & Assessment</h2>
          <ol>
            <li>What's the purpose of underlayment beneath shingles?</li>
            <li>How does step flashing differ from counter flashing?</li>
            <li>What is a typical side‑lap for #15 felt on standard slopes? (Confirm for your jurisdiction.)</li>
            <li>Name two common causes of roof leaks at penetrations.</li>
          </ol>
          
          <div class="answers hidden" id="answers">
            <p><strong>Answer 1:</strong> It provides a secondary moisture barrier beneath the roof covering.</p>
            <p><strong>Answer 2:</strong> Step flashing interleaves with each shingle course at the wall; counter flashing anchors to the wall/chimney and overlaps the step flashing.</p>
            <p><strong>Answer 3:</strong> About 2″ side‑laps (and ~4″ end‑laps) for #15 felt on standard slopes; follow manufacturer and local code.</p>
            <p><strong>Answer 4:</strong> Reverse laps, missing/short step flashing, face‑nailed counter flashing, inadequate boots or missing back‑pans/crickets.</p>
          </div>
          
          <button id="reveal">Reveal Answers</button>
          <button id="complete">Mark Module Complete</button>
        </section>

        <footer>
          <p class="refs"><strong>References (verify latest locally):</strong> Common industry practice; manufacturer installation instructions; residential code provisions for steep‑slope roof coverings; widely referenced felt and ice‑barrier material standards; steep‑slope roofing manuals; ventilation best‑practice guidance from building science and energy agencies.</p>
        </footer>
      </main>
      <script>
        (function(){
          const API = window.API || {
            LMSInitialize: function() { return 'true'; },
            LMSGetValue: function() { return ''; },
            LMSSetValue: function() { return 'true'; },
            LMSCommit: function() { return 'true'; },
            LMSFinish: function() { return 'true'; }
          };

          function postScorm(payload){
            try { 
              window.webkit.messageHandlers.scorm.postMessage(payload); 
            } catch(e) { 
              console.warn('SCORM bridge unavailable', e); 
            }
          }

          function postXAPI(statement){
            try { 
              window.webkit.messageHandlers.xapi.postMessage(statement); 
            } catch(e) { 
              console.warn('xAPI bridge unavailable', e); 
            }
          }

          function init(){
            console.log('[SCORM] initialize');
            postScorm({ command: 'LMSInitialize' });
            
            postXAPI({
              id: crypto.randomUUID(),
              launchId: new URLSearchParams(window.location.search).get('launchId') || 'local',
              actor: { name: 'Learner', mbox: 'mailto:unknown@example.com' },
              verb: { id: 'http://adlnet.gov/expapi/verbs/experienced', display: { 'en-US':'experienced' } },
              object: { 
                id: 'urn:ra:course:roof_systems_anatomy', 
                definition: { 
                  name: { 'en-US': 'Module 1: Roof Anatomy & Terminology' },
                  type: 'http://adlnet.gov/expapi/activities/module'
                } 
              },
              timestamp: new Date().toISOString()
            });
          }

          function complete(){
            postScorm({ command: 'LMSSetValue', key: 'cmi.core.lesson_status', value: 'completed' });
            postScorm({ command: 'LMSSetValue', key: 'cmi.core.score.raw', value: '100' });
            postScorm({ command: 'LMSCommit' });
            
            postXAPI({
              id: crypto.randomUUID(),
              launchId: new URLSearchParams(window.location.search).get('launchId') || 'local',
              actor: { name: 'Learner', mbox: 'mailto:unknown@example.com' },
              verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US':'completed' } },
              object: { 
                id: 'urn:ra:course:roof_systems_anatomy', 
                definition: { 
                  name: { 'en-US': 'Module 1: Roof Anatomy & Terminology' },
                  type: 'http://adlnet.gov/expapi/activities/module'
                } 
              },
              result: {
                completion: true,
                score: { raw: 100, max: 100, min: 0 }
              },
              timestamp: new Date().toISOString()
            });
            
            postScorm({ command: 'LMSFinish' });
            alert('Module marked complete. You may close this window.');
          }

          document.addEventListener('DOMContentLoaded', () => {
            init();
            
            const reveal = document.getElementById('reveal');
            const answers = document.getElementById('answers');
            const completeBtn = document.getElementById('complete');
            
            if (reveal && answers) {
              reveal.addEventListener('click', () => {
                answers.classList.toggle('hidden');
                
                postXAPI({
                  id: crypto.randomUUID(),
                  launchId: new URLSearchParams(window.location.search).get('launchId') || 'local',
                  actor: { name: 'Learner', mbox: 'mailto:unknown@example.com' },
                  verb: { id: 'http://adlnet.gov/expapi/verbs/interacted', display: { 'en-US':'interacted' } },
                  object: { 
                    id: 'urn:ra:course:roof_systems_anatomy:assessment', 
                    definition: { 
                      name: { 'en-US': 'Assessment Review' },
                      type: 'http://adlnet.gov/expapi/activities/interaction'
                    } 
                  },
                  timestamp: new Date().toISOString()
                });
              });
            }
            
            if (completeBtn) {
              completeBtn.addEventListener('click', complete);
            }
          });
        })();
      </script>
    </body>
    </html>
    """
    
    private let safetyCourseHTML = """
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Jobsite Safety Orientation</title>
      <style>
        body { font-family: -apple-system, system-ui; margin: 24px; line-height: 1.6; }
        main { max-width: 880px; margin: auto; }
        h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
        .lede { color: #666; margin-top: 0; }
        section { margin: 1.5rem 0; }
        button { padding: 10px 16px; border-radius: 12px; border: 1px solid #ccc; background: #f6f6f6; }
        button + button { margin-left: 8px; }
        .hidden { display: none; }
        .refs { font-size: 0.9rem; color: #666; }
      </style>
    </head>
    <body>
      <main>
        <header>
          <h1>🛡️ Jobsite Safety Orientation</h1>
          <p class="lede">Essential safety training for construction professionals</p>
        </header>
        
        <section>
          <h2>Learning Objectives</h2>
          <ul>
            <li>Identify common jobsite hazards</li>
            <li>Understand proper use of personal protective equipment (PPE)</li>
            <li>Follow safety protocols and procedures</li>
            <li>Report safety concerns appropriately</li>
          </ul>
        </section>
        
        <section>
          <h2>Common Hazards</h2>
          <p>Construction sites present various hazards including falls, electrical dangers, heavy machinery, and hazardous materials. Always be aware of your surroundings and follow safety protocols.</p>
        </section>
        
        <section>
          <h2>Personal Protective Equipment</h2>
          <p>Proper PPE includes hard hats, safety glasses, steel-toed boots, and high-visibility clothing. Always wear the appropriate equipment for your task and environment.</p>
        </section>
        
        <button id="complete">Mark Complete</button>
      </main>
      <script>
        document.getElementById('complete').addEventListener('click', () => {
          alert('Safety course completed!');
        });
      </script>
    </body>
    </html>
    """
    
    func launchCourse(courseId: String) async throws -> SCORMLaunchToken {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // Map course IDs to their SCORM package URLs
        let scormURL: URL
        let scoId: String
        
        switch courseId {
        case "roof_systems_anatomy":
            // Use embedded HTML content for the roofing course
            scormURL = URL(string: "data:text/html;charset=utf-8,\(roofingCourseHTML.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
            scoId = "SCO1"
        case "safety_101":
            // Use embedded HTML content for the safety course
            scormURL = URL(string: "data:text/html;charset=utf-8,\(safetyCourseHTML.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
            scoId = "SCO1"
        case "concrete_basics":
            scormURL = URL(string: "data:text/html,<html><body><h1>🧱 Concrete Basics Course</h1><p>Learn concrete volume calculations, mix ratios, and field applications.</p><p>Course ID: \(courseId)</p></body></html>")!
            scoId = "SCO1"
        case "osha_hazcom":
            scormURL = URL(string: "data:text/html,<html><body><h1>⚠️ OSHA HazCom Course</h1><p>Hazard Communication Standard training with GHS labeling and SDS interpretation.</p><p>Course ID: \(courseId)</p></body></html>")!
            scoId = "SCO1"
        case "supervisor_communication":
            scormURL = URL(string: "data:text/html,<html><body><h1>👥 Supervisor Communication Course</h1><p>Leadership and communication skills for effective team management.</p><p>Course ID: \(courseId)</p></body></html>")!
            scoId = "SCO1"
        case "waste_reduction":
            scormURL = URL(string: "data:text/html,<html><body><h1>♻️ Waste Reduction Course</h1><p>Material waste minimization and recycling strategies for construction sites.</p><p>Course ID: \(courseId)</p></body></html>")!
            scoId = "SCO1"
        default:
            // Fallback for unknown courses
            scormURL = URL(string: "data:text/html,<html><body><h1>📚 Course: \(courseId)</h1><p>This course is not yet available in development mode.</p><p>Course ID: \(courseId)</p></body></html>")!
            scoId = "SCO1"
        }
        
        // Create a mock SCORM launch token
        let launchId = UUID().uuidString
        let learnerId = "dev_user_123"
        let learnerName = "Development User"
        let expiry = Date().addingTimeInterval(3600) // 1 hour from now
        let xapiEndpoint = URL(string: "http://localhost:3000/lms/xapi/statements")!
        let xapiAuthToken = "mock_xapi_token_\(UUID().uuidString)"
        
        return SCORMLaunchToken(
            launchUrl: scormURL,
            scoId: scoId,
            launchId: launchId,
            learnerId: learnerId,
            learnerName: learnerName,
            expiry: expiry,
            xapiEndpoint: xapiEndpoint,
            xapiAuthToken: xapiAuthToken
        )
    }
}
