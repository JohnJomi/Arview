# Journal Review Automation System: Architecture

Status: draft v1, based on System Architecture v2 and Process Flow v2 diagrams
Reference journal for the first build: *Academy of Management Journal* (AMJ)
Scope of this document: how the system is built (components, stack, data flow, data model, human-override design). It does not cover UI visual design.

---

## 1. Purpose and principles

The system automates the manual, time-consuming parts of journal article review: scope screening, plagiarism screening, subdomain/keyword classification, reviewer matching, and review tracking.

Design principles, carried over from the v2 diagrams:

1. **AI recommends, humans decide.** At every gate (scope, plagiarism, classification, reviewer shortlist, final decision) the AI produces a recommendation with evidence. The editor confirms or overrides. Nothing is rejected or sent without human confirmation.
2. **Local-only models.** No external LLM API is used anywhere. All inference (SPECTER2 embeddings, classifiers) runs on infrastructure we control. The only runtime external dependencies are Turnitin/iThenticate (similarity API) and SMTP (email).
3. **Everything is auditable.** Every AI output and every human override is written to an append-only audit log, including model version and inputs reference.
4. **Humans train the models.** Editor corrections are stored as labelled data. Retraining is performed by people, offline, and new models are promoted manually.
5. **Single journal first, multi-journal ready.** The first build targets one management journal, but every table and config is keyed by `journal_id` so adding journals later is configuration, not a rewrite.

## 2. Assumptions and decisions

| # | Decision | Notes |
|---|---|---|
| 1 | Runtime inference is CPU-only; GPU is used only for model training | SPECTER2 is a BERT-base-sized model and handles journal-scale volume on CPU |
| 2 | Turnitin/iThenticate is the primary plagiarism provider, with a local fallback | License is pending; the fallback is built behind the same interface and is used if Turnitin is unavailable or unlicensed |
| 3 | First journal is a management journal. AMJ is the reference | Scope profile and subdomain taxonomy are seeded from AMJ and confirmed by faculty |
| 4 | Development uses a mock database with mock reviewers | The real reviewer database is integrated later through an import adapter |
| 5 | All model training is done by humans | The system collects labelled corrections but never retrains or promotes models automatically |
| 6 | No external LLM API | Explanations are evidence-based (scores, nearest passages, similar papers), not generated text |

## 3. Reference journal: Academy of Management Journal

AMJ is used to define the first scope profile. According to the Academy of Management, AMJ's mission is to publish empirical research that tests, extends, or builds management theory and contributes to management practice. Its author guidance also routes purely conceptual papers to *Academy of Management Review* and management-education papers to *Academy of Management Learning & Education*.

What this means for the scope matcher:

- **Topical fit** (does the paper concern management and organizations?) can be measured by embedding similarity against a scope profile. This is what SPECTER2 does well.
- **Type fit** (is it empirical, not purely conceptual, not education-focused?) is not a topic question, so embedding similarity alone cannot decide it. The system adds a lightweight rule-based check (presence of data, methods and results sections after extraction) and surfaces it as a separate signal. Final judgement stays with the editor.
- **Seed taxonomy** for the classifier: management subfields such as organizational behavior, human resource management, strategy, entrepreneurship, and international business. Faculty must confirm the final list. It is stored as data, not code.

The scope profile is configuration: the journal's aims-and-scope text plus a set of past published papers, embedded and stored per journal.

## 4. System overview

The architecture follows the six layers in Fig. 1 (v2).

```
PRESENTATION   React dashboard: submission portal, reviewer portal,
               review status page, editor oversight console
      |  HTTPS / REST
APPLICATION    FastAPI: API gateway (JWT, RBAC, rate limiting),
               workflow orchestrator, override and audit service
      |  enqueue stage jobs
AI PIPELINE    Ingestion -> 1 Scope -> 2 Plagiarism -> 3 Classifier
               -> 4 Reviewer matcher -> 5 Notifications
      |
EXTERNAL       Turnitin/iThenticate API, SMTP  (runtime)
               arXiv / IEEE / archive corpora   (offline indexing only)
      |
STORAGE        Object storage, PostgreSQL, pgvector, audit log
      |
GOVERNANCE     Model registry, offline retraining, monitoring,
               security, serving infrastructure
```

## 5. Technology stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React (Vite), TypeScript, Tailwind CSS | Matches the v2 diagram; four role-specific views |
| API | Python, FastAPI, Pydantic | Same language as the ML code; typed request and response models |
| Auth | JWT access tokens, role-based access (Author, Editor, Reviewer, Admin) | API gateway enforces roles on every route |
| Task queue | Celery with Redis broker | Pipeline stages are slow; uploads must return immediately |
| Orchestration | Custom state machine in the application layer, state persisted in PostgreSQL | The flow is linear with human checkpoints; a workflow engine would be heavy for it |
| Database | PostgreSQL 16 | Relational data plus audit log |
| Vector search | pgvector extension | One database for relational and embedding data |
| Object storage | MinIO (S3-compatible), local volume in early dev | PDFs and Turnitin reports |
| PDF parsing | GROBID (primary), PyMuPDF (fallback) | Extracts title, abstract, keywords, sections, references from academic PDFs |
| Embeddings | SPECTER2 (Hugging Face Transformers, PyTorch) | Already chosen; strong for scientific papers |
| Classifiers | scikit-learn (LogReg, MLP), XGBoost | Existing consensus approach |
| Keyword extraction | Embedding-based extraction using SPECTER2 vectors | Local, no LLM needed |
| Email | SMTP via the framework mailer; MailHog in development | |
| Model registry | MLflow | Versioned embeddings model and classifiers |
| Monitoring | Prometheus and Grafana for service health; Evidently for drift and override-rate reports | |
| Packaging | Docker and Docker Compose | One command to run the whole stack |
| Testing | pytest, Playwright, seeded mock data | See section 14 |

## 6. Components

### 6.1 Presentation layer (React)

| View | Users | Responsibilities |
|---|---|---|
| Submission portal | Author | Upload PDF and metadata, track status, receive decision |
| Reviewer portal | Reviewer | Accept or decline an invitation, download the manuscript, submit the report |
| Review status page | Editor | Per-reviewer progress and overdue flags |
| Editor oversight console | Editor | Stage queues, scores and evidence, approve, override, re-run any stage |

The editor console is a human control point in Fig. 1 and Fig. 2. Each queue item shows the AI recommendation, confidence or score, and the evidence behind it.

### 6.2 Application layer (FastAPI)

- **API gateway.** Authentication (JWT), role-based access control, and rate limiting. All traffic from the frontend passes through it.
- **Workflow orchestrator.** Owns the submission state machine (section 8). It enqueues the next pipeline job when a stage completes or a human decision arrives, and it blocks progress at every human checkpoint.
- **Override and audit service.** The only path that records human decisions. Supports approve, override, and re-run for any stage. Writes to the audit log in the same database transaction as the state change, so the two cannot diverge.

### 6.3 AI pipeline (Python services, Celery workers)

Each stage is a worker task with a fixed contract: input is a submission id and stage config, output is a stage result written to `pipeline_runs`. Stages never change submission state directly; they report results and the orchestrator decides what happens next.

| Stage | Responsibility |
|---|---|
| Ingestion | Parse PDF, extract text, abstract, keywords, sections, references; store the file. On failure, request re-upload (Fig. 2) |
| 1 Scope matcher | Embed the abstract and compare to the journal scope profile; run the type-fit rule check; produce score and evidence |
| 2 Plagiarism | Request a similarity report from the provider; produce score and matched sources |
| 3 Classifier | Produce subdomains, keywords, and a per-model confidence plus consensus flag |
| 4 Reviewer matcher | Rank reviewers by expertise similarity, with COI and workload filters |
| 5 Notifications | Send invitations, reminders, and status emails |

### 6.4 External services

- **Turnitin / iThenticate** (runtime, license pending). Accessed through a `SimilarityProvider` interface. Note that this sends the manuscript to a third party, so it is documented in the security section and needs the editor's or journal's consent.
- **SMTP** (runtime). Email delivery.
- **arXiv, IEEE Xplore, journal archive** (offline only). Used by an indexing job that builds reference embeddings in pgvector. They are not called during a submission.

### 6.5 Storage

| Store | Contents |
|---|---|
| Object storage | Submitted PDFs, Turnitin reports |
| PostgreSQL | Submissions, reviewers, assignments, stage results, decisions, config |
| pgvector | Paper embeddings, scope profile embeddings, reviewer embeddings, reference-corpus embeddings |
| Audit log | Append-only record of every AI output and human override |

### 6.6 Governance

- **Model registry (MLflow).** Every embeddings model and classifier is versioned. Pipeline results record the model version used.
- **Training (offline, human-run).** See section 11.
- **Monitoring.** Service health, queue depth, stage latency, and quality signals: override rate per stage, score drift, and fairness checks across subdomains.
- **Security.** Section 12.
- **Serving.** Docker Compose for the demo; autoscaling is future work (see section 15).

## 7. Pipeline stage specifications

Thresholds below are configuration per journal, stored in the database and calibrated on labelled examples. No numeric value is hard-coded in this document.

### 7.1 Ingestion

1. Receive PDF and metadata (title, authors, affiliations, declared keywords).
2. Run GROBID; fall back to PyMuPDF if GROBID fails.
3. Extract: abstract, full text, section headings, references.
4. Validate: non-empty abstract and minimum text length. If validation fails, mark `EXTRACTION_FAILED`, log the error, notify the author to re-upload.

### 7.2 Stage 1: Scope matcher

- Embed the abstract (and optionally title plus keywords) with SPECTER2.
- Score = similarity to the journal scope profile (aims-and-scope text plus sampled past papers).
- Type-fit signals: has methods section, has data or results section, flagged as likely conceptual, flagged as likely education-focused.
- Output: scope score, nearest scope passages, three most similar archive papers, type-fit signals, recommendation `IN_SCOPE` or `OUT_OF_SCOPE`.
- If out of scope: the submission waits in the editor's "scope flag" queue. Confirm leads to desk reject; override continues to plagiarism.

### 7.3 Stage 2: Plagiarism

- Provider interface: `get_similarity(submission) -> SimilarityResult`.
- **Primary:** Turnitin / iThenticate.
- **Fallback (local):** chunk the text, embed chunks, search pgvector against the journal archive and reference corpora, and combine with n-gram overlap. Produces an overall score and matched passages with source references.
- Provider selection and automatic failover are configuration. A provider failure (timeout, quota, missing license) routes to the fallback and is recorded; if both fail, the item goes to the editor.
- If the score exceeds the threshold: the editor sees the report and confirms desk reject or overrides.

### 7.4 Stage 3: Classifier

- Input: SPECTER2 embedding of the paper.
- Models: LogReg, MLP, XGBoost, each predicting subdomains; consensus by agreement plus mean confidence.
- Keywords: embedding-based extraction.
- "Reliable consensus?" in Fig. 2 is true when the models agree and confidence passes the threshold. If not, the editor corrects subdomains and keywords before matching continues. Every correction is stored as a labelled example.

> **Important risk.** The existing classification model was built against a different domain taxonomy. For a management journal the label set differs, so the classifiers must be retrained by people on management-labelled data before they can be trusted. Until then, the classifier stage should run in "suggest only" mode and every item goes through correction. SPECTER2 embeddings themselves are domain-general and can be reused.

### 7.5 Stage 4: Reviewer matcher

1. Hard filters: conflict of interest (same institution, co-authorship, declared conflicts), availability, and workload cap.
2. Ranking: similarity between the paper embedding and each reviewer's interest embedding, plus subdomain overlap.
3. Output: ranked shortlist with score, matching subdomains, and any soft warnings.
4. The editor approves, edits, or replaces the shortlist before any invitation is sent.

### 7.6 Stage 5: Notifications

- Invitation emails to approved reviewers in rank order.
- If a reviewer declines or does not respond within the configured window, the next ranked reviewer is invited.
- Reminders for overdue reviews; status emails to the author at decision points.

## 8. Workflow state machine

```
SUBMITTED
  -> EXTRACTING
       -> EXTRACTION_FAILED -> (author re-uploads) -> SUBMITTED
       -> SCOPE_CHECK
            -> SCOPE_FLAGGED   [editor: confirm -> DESK_REJECTED | override -> PLAGIARISM_CHECK]
            -> PLAGIARISM_CHECK
                 -> PLAGIARISM_FLAGGED [editor: confirm -> DESK_REJECTED | override -> CLASSIFYING]
                 -> CLASSIFYING
                      -> CLASSIFICATION_REVIEW [editor corrects labels -> REVIEWER_RANKING]
                      -> REVIEWER_RANKING
                           -> SHORTLIST_PENDING [editor approves/edits]
                                -> INVITING
                                     -> IN_REVIEW
                                          -> AWAITING_DECISION
                                               -> DECIDED (accept | revise | reject)
```

Rules:

- A transition into any `*_FLAGGED`, `*_REVIEW`, `SHORTLIST_PENDING`, or `AWAITING_DECISION` state requires a human action to leave.
- The editor can re-run any completed stage. The previous result is kept; the new result is added as a new `pipeline_runs` row.
- The editor can override any stage from the oversight console, including stages that passed.
- Every transition is written to the audit log with actor (system or user), timestamp, and reason.

## 9. Data model

All tables carry `journal_id` unless noted.

| Table | Key columns | Purpose |
|---|---|---|
| `journals` | id, name, scope_text, config (JSON: thresholds, providers) | One row per journal |
| `users` | id, email, role, password_hash | Authors, editors, reviewers, admins |
| `reviewers` | id, user_id?, name, email, institution, domains[], interests_text, workload_cap, active | Reviewer directory |
| `reviewer_embeddings` | reviewer_id, embedding (vector), model_version | Expertise vectors |
| `submissions` | id, journal_id, author_id, title, abstract, keywords, state, created_at | Core entity |
| `manuscript_files` | id, submission_id, version, object_key, checksum | PDF versions |
| `pipeline_runs` | id, submission_id, stage, status, output (JSON), model_version, started_at, finished_at | Every AI stage result |
| `stage_decisions` | id, pipeline_run_id, editor_id, action (approve / override / rerun), reason, created_at | Every human decision |
| `classifications` | submission_id, subdomains[], keywords[], model_confidences (JSON), consensus | Latest accepted labels |
| `review_assignments` | id, submission_id, reviewer_id, rank, status, invited_at, due_at, responded_at | Reviewer workflow |
| `reviews` | id, assignment_id, report_object_key, recommendation, submitted_at | Reviewer output |
| `notifications` | id, user_id, type, payload, sent_at, status | Email log |
| `audit_log` | id, ts, actor_type, actor_id, submission_id, event, payload (JSON) | Append-only; no updates or deletes |
| `archive_papers` | id, journal_id, source, title, abstract, embedding (vector) | Scope profile samples and similarity references |
| `correction_labels` | id, submission_id, field, ai_value, human_value, model_version, created_at | Training data from editor corrections |
| `model_versions` | id, name, kind, mlflow_run, status | Which models are active |

`audit_log` is enforced append-only at the database level (revoked UPDATE and DELETE privileges for the application role).

## 10. API surface (outline)

| Area | Endpoints (examples) | Roles |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh` | All |
| Submissions | `POST /submissions`, `GET /submissions/{id}`, `GET /submissions?state=` | Author, Editor |
| Pipeline | `GET /submissions/{id}/runs`, `POST /submissions/{id}/stages/{stage}/rerun` | Editor |
| Decisions | `POST /submissions/{id}/stages/{stage}/decision` (approve or override, with reason) | Editor |
| Reviewers | `GET /reviewers`, `POST /submissions/{id}/shortlist` | Editor |
| Invitations | `POST /assignments/{id}/respond`, `POST /assignments/{id}/report` | Reviewer |
| Status | `GET /submissions/{id}/review-status` | Editor |
| Audit | `GET /submissions/{id}/audit` | Editor, Admin |
| Admin | `POST /admin/reviewers/import`, `PUT /admin/journals/{id}/config` | Admin |

## 11. Model training and governance (human-run)

Training is a deliberate, offline human process. The system supports it but never automates it.

1. **Collect.** Every editor correction (scope, classification labels, reviewer choices) is stored in `correction_labels` with the model version that produced the AI value.
2. **Export.** An admin exports a labelled dataset from the database.
3. **Train.** People run training on a GPU machine, outside the serving stack. Experiments are tracked in MLflow.
4. **Evaluate.** Compare against the current model on a held-out set, including per-subdomain results.
5. **Promote.** A human registers and promotes the new version in the registry. The pipeline picks up the active version from `model_versions`.
6. **Monitor.** Evidently reports on score drift and override rate. A rising override rate is the signal that retraining is due.

Embeddings for stored papers and reviewers are tagged with a model version, so a SPECTER2 change triggers a controlled re-embedding job.

## 12. Security, privacy, and responsible AI

- **Confidentiality.** Unpublished manuscripts never go to an external LLM. The only third-party transfer is Turnitin, which requires explicit approval and is logged. With the local fallback, no manuscript leaves the infrastructure.
- **Encryption.** TLS in transit; encryption at rest for object storage and the database volume.
- **Access control.** RBAC at the gateway. Reviewers see only the manuscripts assigned to them. Reviewer identities are hidden from authors; author identities can be hidden from reviewers if the journal uses blind review (configurable).
- **Retention and consent.** Configurable retention for manuscripts of rejected papers; consent text on upload covering the plagiarism check.
- **Responsible AI.** Human override at every stage; evidence shown with every recommendation; fairness checks on classification and reviewer assignment by subdomain and by reviewer workload; complete audit trail.

## 13. Development setup and mock data

Real reviewer data is not used during development.

- **Mock database.** A seed script creates a journal row for AMJ, an admin, two editors, a set of authors, and about 50 mock reviewers with varied domains, interests, institutions, and workload caps. It also creates a few deliberate conflicts (shared institution, co-authorship) to test COI filtering.
- **Mock archive.** A small set of archive papers (public abstracts) to seed the scope profile and the similarity fallback.
- **Mock providers.** A fake `SimilarityProvider` returns configurable scores so every branch (clean, flagged, provider failure) can be tested without a Turnitin license. MailHog captures emails locally.
- **Import adapter.** The real reviewer database is integrated later through an adapter that maps its schema to `reviewers`. Nothing else in the system depends on where reviewers come from.
- **Run.** `docker compose up` starts API, workers, Redis, Postgres with pgvector, MinIO, GROBID, MailHog, and the frontend.

## 14. Testing strategy (outline)

- **Unit:** state-machine transitions, COI filter, ranking function, provider failover.
- **Integration:** each stage against seeded data; end-to-end submission from upload to decision using mock providers.
- **Model evaluation:** scope threshold calibration on labelled in-scope and out-of-scope examples; classifier accuracy per subdomain; reviewer-matching sanity checks.
- **Human-override tests:** every gate can be overridden and re-run, and each action produces the expected audit entries.
- **UI:** Playwright flows for the four role views.

## 15. Multi-journal readiness and future work

**Multi-journal.** Per-journal items are all data: scope profile, subdomain taxonomy, thresholds, provider selection, reviewer pool. Per-journal model versions are supported through `model_versions` linked to `journal_id`. Adding a second journal means adding its scope text, taxonomy, archive sample, and reviewer pool, and training or reusing classifiers for its labels.

**Future work.**
- Autoscaling and GPU serving (currently drawn in Fig. 1 but not needed at journal scale).
- Integration with the journal's real reviewer database.
- Optional local small model for drafting letters or summaries, only if a need appears.
- Co-reviewer fairness analysis dashboards.

## 16. Changes needed in the diagrams (v2 to v3)

1. Add an arrow from *Reference corpora* to *Plagiarism* in Fig. 1 (needed by the local fallback).
2. Redraw *Reference corpora* as an offline indexing path into pgvector instead of a live runtime call.
3. Add a Turnitin failure path in Fig. 2 (timeout, quota, no license) leading to the fallback or the editor.
4. Add a *Task queue (Redis)* between the workflow orchestrator and the AI pipeline in Fig. 1.
5. Mark autoscaling in the Governance layer as future work.
6. Add a type-fit check (methods/data present) next to the scope decision in Fig. 2.

## 17. Open items

- Faculty to confirm the AMJ-based subdomain taxonomy and scope profile content.
- Confirm Turnitin license status and consent wording for third-party transfer.
- Decide thresholds after a calibration round on labelled examples.
- Confirm blind-review policy for the journal.
- Confirm the real reviewer database schema before writing the import adapter.

## Sources

- Academy of Management, *Academy of Management Journal* mission statement: https://www.aom.org/?p=346
- AMJ routing of conceptual and education papers to AMR and AMLE: author guidance summary at https://apps.lib.whu.edu.cn/enssci/show.asp?id=4
