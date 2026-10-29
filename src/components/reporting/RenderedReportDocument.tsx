import React from 'react';
import { AssembledClinicalReport } from '../../types/reporting';
import {
  FileText,
  User,
  Calendar,
  Stethoscope,
  Brain,
  Target,
  ListTodo,
  TrendingUp,
  LogOut,
  ShieldAlert,
  Home,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface RenderedReportDocumentProps {
  report: AssembledClinicalReport;
}

export const RenderedReportDocument: React.FC<RenderedReportDocumentProps> = ({ report }) => {
  const {
    header,
    patientInfo,
    caseOverview,
    subjective,
    objectiveFindings,
    problems,
    goals,
    treatments,
    sessions,
    progressOutcomes,
    discharge,
    evidence,
    therapistDeclaration,
    config,
  } = report;

  const isIncluded = (sectionId: string) => config.includedSectionIds.includes(sectionId as any);

  return (
    <div
      id="physiocase-report-document"
      className="bg-white text-[#18201C] p-6 sm:p-10 max-w-4xl mx-auto shadow-sm rounded-xl border border-[#E3DDD2] space-y-8 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
    >
      {/* 1. Header & Clinic Branding */}
      <header className="border-b-2 border-[#1B3B2B] pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B3B2B] inline-block print:hidden" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B3B2B]">
                {header.clinicName}
              </h1>
            </div>
            <p className="text-xs text-[#525953] mt-0.5">
              {header.practitionerName} • {header.credentials}
              {header.licenseNumber && ` • Reg: ${header.licenseNumber}`}
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-[#EBF2EE] text-[#1B3B2B] rounded border border-[#CAD8D0] print:border-gray-400 print:text-black">
              {header.reportTitle}
            </span>
            <p className="text-xs text-[#636A64]">
              Generated: <span className="font-medium text-[#18201C]">{header.generatedDate}</span>
            </p>
            {header.deIdentified && (
              <span className="inline-block text-[11px] font-semibold text-[#8B6B23] bg-[#FAF3E0] px-2 py-0.5 rounded border border-[#EBD79B] print:border-gray-400">
                De-Identified for Clinical / Audit Use
              </span>
            )}
          </div>
        </div>

        {/* Intended Recipient (for Referral Communication) */}
        {(header.recipientName || header.facilityName) && (
          <div className="pt-3 border-t border-[#EAE4DB] flex flex-wrap gap-4 text-xs bg-[#FAF8F5] p-3 rounded-lg border border-[#E3DDD2] print:bg-transparent print:border-gray-300">
            <div>
              <span className="text-[#636A64] block">Intended Recipient:</span>
              <span className="font-semibold text-[#18201C]">
                {header.recipientName || 'Treating Physician / Specialist'}
                {header.recipientRole && ` (${header.recipientRole})`}
              </span>
            </div>
            {header.facilityName && (
              <div>
                <span className="text-[#636A64] block">Facility / Practice:</span>
                <span className="font-semibold text-[#18201C]">{header.facilityName}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {/* 2. Patient Demographics & Case Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
        {isIncluded('patient_demographics') && (
          <section className="print-avoid-break bg-[#FAF8F5] p-4 rounded-lg border border-[#EAE4DB] space-y-2.5 print:bg-transparent print:border-gray-300">
            <h2 className="text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#1B3B2B]" />
              Patient Identification
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#636A64] block">Name / ID:</span>
                <span className="font-semibold text-[#18201C]">{patientInfo.displayName}</span>
              </div>
              {patientInfo.patientNumber && (
                <div>
                  <span className="text-[#636A64] block">Patient No:</span>
                  <span className="font-mono font-medium text-[#18201C]">{patientInfo.patientNumber}</span>
                </div>
              )}
              {patientInfo.dateOfBirth && (
                <div>
                  <span className="text-[#636A64] block">Date of Birth:</span>
                  <span className="font-medium text-[#18201C]">{patientInfo.dateOfBirth}</span>
                </div>
              )}
              {patientInfo.age && (
                <div>
                  <span className="text-[#636A64] block">Age:</span>
                  <span className="font-medium text-[#18201C]">{patientInfo.age}</span>
                </div>
              )}
              {patientInfo.sex && (
                <div>
                  <span className="text-[#636A64] block">Sex:</span>
                  <span className="font-medium text-[#18201C]">{patientInfo.sex}</span>
                </div>
              )}
              {patientInfo.phone && (
                <div>
                  <span className="text-[#636A64] block">Phone:</span>
                  <span className="font-medium text-[#18201C]">{patientInfo.phone}</span>
                </div>
              )}
              {patientInfo.email && (
                <div className="col-span-2">
                  <span className="text-[#636A64] block">Email:</span>
                  <span className="font-medium text-[#18201C]">{patientInfo.email}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {isIncluded('case_overview') && (
          <section className="print-avoid-break bg-[#FAF8F5] p-4 rounded-lg border border-[#EAE4DB] space-y-2.5 print:bg-transparent print:border-gray-300">
            <h2 className="text-xs font-semibold text-[#1B3B2B] uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1B3B2B]" />
              Episode Overview
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#636A64] block">Case Title:</span>
                <span className="font-semibold text-[#18201C]">{caseOverview.caseName}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Case Ref:</span>
                <span className="font-mono font-medium text-[#18201C]">{caseOverview.caseId}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Episode Start:</span>
                <span className="font-medium text-[#18201C]">{caseOverview.startDate}</span>
              </div>
              {caseOverview.dateOfOnset && (
                <div>
                  <span className="text-[#636A64] block">Date of Onset:</span>
                  <span className="font-medium text-[#18201C]">{caseOverview.dateOfOnset}</span>
                </div>
              )}
              <div>
                <span className="text-[#636A64] block">Referral:</span>
                <span className="font-medium text-[#18201C]">{caseOverview.referralSource}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Status:</span>
                <span className="font-semibold text-[#1B3B2B]">{caseOverview.status}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Duration:</span>
                <span className="font-medium text-[#18201C]">{caseOverview.episodeDuration}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Encounters:</span>
                <span className="font-medium text-[#18201C]">{caseOverview.totalEncounters} Sessions</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* 3. Subjective Assessment Findings */}
      {isIncluded('subjective_assessment') && subjective && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1B3B2B]" />
            Subjective Assessment Findings
          </h2>
          <div className="bg-white border border-[#E3DDD2] rounded-lg p-4 space-y-3 text-xs leading-relaxed print:border-gray-300">
            {subjective.chiefComplaint && (
              <div>
                <span className="font-semibold text-[#343B36]">Chief Complaint: </span>
                <span className="text-[#18201C]">{subjective.chiefComplaint}</span>
              </div>
            )}
            {subjective.painLocation && (
              <div>
                <span className="font-semibold text-[#343B36]">Symptom Location: </span>
                <span className="text-[#18201C]">{subjective.painLocation}</span>
              </div>
            )}
            {subjective.painIntensity && (
              <div>
                <span className="font-semibold text-[#343B36]">Reported Pain Scale: </span>
                <span className="text-[#18201C]">{subjective.painIntensity}</span>
              </div>
            )}
            {subjective.symptomBehavior && (
              <div>
                <span className="font-semibold text-[#343B36]">Symptom Behavior & Aggravating Factors: </span>
                <span className="text-[#18201C]">{subjective.symptomBehavior}</span>
              </div>
            )}
            {subjective.functionalDifficulties.length > 0 && (
              <div>
                <span className="font-semibold text-[#343B36]">Reported Functional Limitations: </span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#18201C] pl-2">
                  {subjective.functionalDifficulties.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {subjective.medicalHistory && (
              <div>
                <span className="font-semibold text-[#343B36]">Relevant Medical History & Medications: </span>
                <span className="text-[#18201C]">{subjective.medicalHistory}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-[#343B36]">Safety Screening / Red Flags: </span>
              <span className="text-[#18201C]">{subjective.safetyScreeningStatus}</span>
              {subjective.safetyDetails && (
                <p className="text-[#636A64] mt-0.5 pl-2 italic">{subjective.safetyDetails}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. Objective Examination Findings */}
      {isIncluded('objective_findings') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#1B3B2B]" />
            Objective Physical Findings
          </h2>
          {objectiveFindings.length > 0 ? (
            <div className="border border-[#E3DDD2] rounded-lg overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD2] text-[#414843] font-semibold print:bg-gray-100">
                    <th className="py-2 px-3 w-1/3">Examination Area</th>
                    <th className="py-2 px-3">Documented Clinical Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4DB] print:divide-gray-300">
                  {objectiveFindings.map((f, i) => (
                    <tr key={i} className="hover:bg-[#FAF8F5]/50">
                      <td className="py-2 px-3 font-medium text-[#18201C] align-top">{f.examinationArea}</td>
                      <td className="py-2 px-3 text-[#343B36] align-top whitespace-pre-wrap">{f.finding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No discrete objective physical findings documented.
            </p>
          )}
        </section>
      )}

      {/* 5. Clinical Reasoning & Problems */}
      {isIncluded('clinical_reasoning_problems') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#1B3B2B]" />
            Clinical Reasoning & Formulated Problems
          </h2>
          {problems.length > 0 ? (
            <div className="space-y-2">
              {problems.map((p, i) => (
                <div
                  key={i}
                  className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-3 text-xs space-y-1.5 print:bg-transparent print:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[#18201C]">{p.title}</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-[#DDD6CB] text-[#343B36]">
                      {p.status}
                    </span>
                  </div>
                  {p.description && <p className="text-[#525953]">{p.description}</p>}
                  {p.linkedFindings.length > 0 && (
                    <div className="text-[11px] text-[#636A64]">
                      <span className="font-medium">Physical Findings: </span>
                      {p.linkedFindings.join('; ')}
                    </div>
                  )}
                  {p.linkedInvestigations && p.linkedInvestigations.length > 0 && (
                    <div className="text-[11px] text-[#1D4E89]">
                      <span className="font-medium">Diagnostic Imaging: </span>
                      {p.linkedInvestigations.join('; ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No clinical problems formulated.
            </p>
          )}
        </section>
      )}

      {/* 6. Functional Goals */}
      {isIncluded('functional_goals') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1B3B2B]" />
            Patient Functional Goals
          </h2>
          {goals.length > 0 ? (
            <div className="border border-[#E3DDD2] rounded-lg overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD2] text-[#414843] font-semibold print:bg-gray-100">
                    <th className="py-2 px-3">Goal Description</th>
                    <th className="py-2 px-3 w-28">Type</th>
                    <th className="py-2 px-3 w-28">Status</th>
                    <th className="py-2 px-3 w-28">Target Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4DB] print:divide-gray-300">
                  {goals.map((g, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-[#18201C]">{g.description}</td>
                      <td className="py-2 px-3 text-[#525953]">{g.type}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-[#1B3B2B]">{g.status}</span>
                      </td>
                      <td className="py-2 px-3 text-[#636A64]">{g.targetDate || 'Not specified'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No structured functional goals documented.
            </p>
          )}
        </section>
      )}

      {/* 7. Treatment Interventions */}
      {isIncluded('treatment_plan_selections') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-[#1B3B2B]" />
            Interventions & Prescribed Management
          </h2>
          {treatments.length > 0 ? (
            <div className="space-y-2">
              {treatments.map((t, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#E3DDD2] rounded-lg p-3 text-xs space-y-1 print:border-gray-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[#18201C]">
                      {t.title}{' '}
                      <span className="font-normal text-[#636A64]">({t.interventionType})</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#1B3B2B] uppercase">{t.status}</span>
                  </div>
                  {t.parametersText && (
                    <p className="text-[#343B36] font-medium">Dosage: {t.parametersText}</p>
                  )}
                  {t.rationale && (
                    <p className="text-[#636A64] italic">Rationale: {t.rationale}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No treatment interventions recorded.
            </p>
          )}
        </section>
      )}

      {/* 8. Clinical Sessions History */}
      {isIncluded('session_history') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1B3B2B]" />
            Clinical Encounter Log ({sessions.length} Encounters)
          </h2>
          {sessions.length > 0 ? (
            <div className="border border-[#E3DDD2] rounded-lg overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD2] text-[#414843] font-semibold print:bg-gray-100">
                    <th className="py-2 px-3 w-16">#</th>
                    <th className="py-2 px-3 w-28">Date</th>
                    <th className="py-2 px-3 w-28">Tolerance</th>
                    <th className="py-2 px-3">Delivered Interventions & Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4DB] print:divide-gray-300">
                  {sessions.map((s, i) => (
                    <tr key={i} className="hover:bg-[#FAF8F5]/50">
                      <td className="py-2 px-3 font-semibold text-[#1B3B2B] align-top">S-{s.sessionNumber}</td>
                      <td className="py-2 px-3 font-medium text-[#18201C] align-top">{s.date}</td>
                      <td className="py-2 px-3 text-[#525953] align-top">{s.tolerance}</td>
                      <td className="py-2 px-3 text-[#343B36] align-top space-y-1">
                        {s.deliveriesSummary && (
                          <div className="font-medium text-[#18201C]">{s.deliveriesSummary}</div>
                        )}
                        {s.subjectiveCheckIn && (
                          <div className="text-[#636A64]">Check-in: {s.subjectiveCheckIn}</div>
                        )}
                        {s.therapistNotes && (
                          <div className="text-[#636A64] italic">Notes: {s.therapistNotes}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No clinical sessions logged.
            </p>
          )}
        </section>
      )}

      {/* 9. Longitudinal Progress & Outcomes */}
      {isIncluded('progress_outcomes') && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1B3B2B]" />
            Outcome Measurements & Longitudinal Change
          </h2>
          {progressOutcomes.length > 0 ? (
            <div className="border border-[#E3DDD2] rounded-lg overflow-hidden print:border-gray-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E3DDD2] text-[#414843] font-semibold print:bg-gray-100">
                    <th className="py-2 px-3">Outcome Measure</th>
                    <th className="py-2 px-3 w-32">Category</th>
                    <th className="py-2 px-3 w-28 text-center">Baseline</th>
                    <th className="py-2 px-3 w-28 text-center">Discharge / Latest</th>
                    <th className="py-2 px-3 w-28 text-center">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4DB] print:divide-gray-300">
                  {progressOutcomes.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-medium text-[#18201C]">{item.measureName}</td>
                      <td className="py-2 px-3 text-[#636A64] capitalize">{item.category}</td>
                      <td className="py-2 px-3 text-center text-[#525953]">{item.baselineValue}</td>
                      <td className="py-2 px-3 text-center font-medium text-[#18201C]">{item.dischargeValue}</td>
                      <td className="py-2 px-3 text-center font-semibold text-[#1B3B2B]">{item.netChange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-[#636A64] italic bg-[#FAF8F5] p-3 rounded border border-[#EAE4DB]">
              No longitudinal outcome measurements recorded.
            </p>
          )}
        </section>
      )}

      {/* 10. Discharge Summary */}
      {isIncluded('discharge_summary') && discharge && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <LogOut className="w-4 h-4 text-[#1B3B2B]" />
            Case Discharge Evaluation & Course of Care
          </h2>
          <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-4 space-y-3 text-xs leading-relaxed print:bg-transparent print:border-gray-300">
            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-[#EAE4DB]">
              <div>
                <span className="text-[#636A64] block">Discharge Date:</span>
                <span className="font-semibold text-[#18201C]">{discharge.dischargeDate}</span>
              </div>
              <div>
                <span className="text-[#636A64] block">Reason for Discharge:</span>
                <span className="font-semibold text-[#1B3B2B]">{discharge.dischargeReason}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-[#343B36] block mb-1">
                Narrative Synthesis of Clinical Course:
              </span>
              <p className="text-[#18201C] whitespace-pre-wrap">{discharge.episodeSummary}</p>
            </div>

            <div>
              <span className="font-semibold text-[#343B36] block mb-1">
                Final Clinical Status at Discharge:
              </span>
              <p className="text-[#18201C] whitespace-pre-wrap">{discharge.clinicalStatusAtDischarge}</p>
            </div>
          </div>
        </section>
      )}

      {/* 11. Home Maintenance Plan (HEP) */}
      {isIncluded('home_maintenance_plan') && discharge?.homeMaintenancePlan && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <Home className="w-4 h-4 text-[#1B3B2B]" />
            Home Exercise & Self-Management Plan
          </h2>
          <div className="bg-white border border-[#E3DDD2] rounded-lg p-4 text-xs leading-relaxed text-[#18201C] whitespace-pre-wrap print:border-gray-300">
            {discharge.homeMaintenancePlan}
          </div>
        </section>
      )}

      {/* 12. Precautions & Warning Signs */}
      {isIncluded('precautions_warning_signs') && discharge?.precautionsAndWarningSigns && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#8B2D1B] uppercase tracking-wider pb-1.5 border-b border-[#EBD0CA] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#8B2D1B]" />
            Precautions, Red Flags & Symptoms Requiring Review
          </h2>
          <div className="bg-[#FDF9F8] border border-[#F0D5D0] rounded-lg p-4 text-xs leading-relaxed text-[#5F1D11] whitespace-pre-wrap print:bg-transparent print:border-gray-300 print:text-black">
            {discharge.precautionsAndWarningSigns}
          </div>
        </section>
      )}

      {/* 13. Follow-Up / Referral */}
      {isIncluded('follow_up_referral') && discharge?.referralOrFollowUp && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1B3B2B]" />
            Follow-Up Directions & Specialist Referrals
          </h2>
          <div className="bg-white border border-[#E3DDD2] rounded-lg p-4 text-xs leading-relaxed text-[#18201C] whitespace-pre-wrap print:border-gray-300">
            {discharge.referralOrFollowUp}
          </div>
        </section>
      )}

      {/* 14. Evidence Citations */}
      {isIncluded('evidence_citations') && evidence.length > 0 && (
        <section className="print-avoid-break space-y-3 pt-2">
          <h2 className="text-sm font-bold text-[#1B3B2B] uppercase tracking-wider pb-1.5 border-b border-[#E3DDD2] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1B3B2B]" />
            Documented Clinical Evidence & References
          </h2>
          <div className="space-y-2">
            {evidence.map((item, i) => (
              <div key={i} className="bg-[#FAF8F5] p-3 rounded border border-[#E3DDD2] text-xs space-y-1 print:bg-transparent print:border-gray-300">
                <p className="font-semibold text-[#18201C]">{item.title}</p>
                {item.authors && <p className="text-[#636A64]">{item.authors}</p>}
                {item.clinicalTakeaway && (
                  <p className="text-[#343B36] italic">Takeaway: {item.clinicalTakeaway}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 15. Therapist Declaration / Signature Block */}
      {isIncluded('therapist_declaration') && (
        <footer className="print-avoid-break pt-8 mt-6 border-t-2 border-[#1B3B2B] space-y-4 print:pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs">
            <div className="space-y-1">
              <p className="text-[#636A64]">Treating Physiotherapist:</p>
              <p className="font-bold text-[#18201C] text-sm">{therapistDeclaration.practitionerName}</p>
              <p className="text-[#414843]">{therapistDeclaration.credentials}</p>
              {therapistDeclaration.licenseNumber && (
                <p className="text-[#636A64]">Registration No: {therapistDeclaration.licenseNumber}</p>
              )}
              <p className="text-[#636A64]">{therapistDeclaration.clinicName}</p>
            </div>

            <div className="w-64 border-t border-[#18201C] pt-2 text-center sm:text-right space-y-1">
              <span className="text-[11px] text-[#636A64] block">Clinician Signature / Authentication</span>
              <p className="font-mono text-xs text-[#1B3B2B] font-semibold">
                [Electronically Verified]
              </p>
              <p className="text-[11px] text-[#636A64]">Date: {therapistDeclaration.date}</p>
            </div>
          </div>
          <p className="text-[10px] text-[#868D88] text-center print:text-gray-500">
            This document is a formal clinical record generated by PhysioCase. It reflects therapist-authored documentation and objective outcomes recorded during the episode of care.
          </p>
        </footer>
      )}
    </div>
  );
};
