import React from 'react';
import { AssembledLongitudinalPatientReport } from '../../types/reporting';
import { formatClinicalDate } from '../../utils/clinicalFormatters';
import {
  ShieldAlert,
  FolderKanban,
  Target,
  TrendingUp,
  Activity,
  Clock,
  User,
  FileCheck2,
} from 'lucide-react';

interface LongitudinalReportDocumentProps {
  report: AssembledLongitudinalPatientReport;
}

export const LongitudinalReportDocument: React.FC<LongitudinalReportDocumentProps> = ({
  report,
}) => {
  const { config, header, patientInfo, safety, episodes, cumulativeProblems, outcomeSeries, historicalTreatments, timelineEvents, therapistDeclaration } = report;
  const isIncluded = (sectionId: string) => config.includedSectionIds.includes(sectionId as any);

  return (
    <div
      id="longitudinal-report-document"
      className="bg-white text-[#18201C] p-6 sm:p-10 max-w-4xl mx-auto shadow-sm border border-[#E6E0D5] print:border-none print:shadow-none print:p-0 print:max-w-none text-xs leading-relaxed space-y-6"
    >
      {/* 1. Header Section */}
      {isIncluded('header') && (
        <div className="border-b-2 border-[#1B3B2B] pb-4 space-y-3 break-inside-avoid">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1B3B2B] tracking-tight uppercase">
                {header.clinicName}
              </h1>
              <p className="text-xs text-[#525954] mt-0.5">
                {header.practitionerName} &bull; {header.credentials}
                {header.licenseNumber && ` &bull; Lic: ${header.licenseNumber}`}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                {header.reportTitle}
              </span>
              <p className="text-[11px] text-[#636A64] mt-1 font-mono">
                Date: {header.generatedDate}
              </p>
            </div>
          </div>

          {(header.recipientName || header.facilityName) && (
            <div className="pt-2 text-xs text-[#343B36] border-t border-[#EAE4DB]">
              <span className="font-semibold text-[#18201C]">Prepared For: </span>
              {header.recipientName && <span>{header.recipientName} </span>}
              {header.recipientRole && <span>({header.recipientRole}) </span>}
              {header.facilityName && <span>&bull; {header.facilityName}</span>}
            </div>
          )}
        </div>
      )}

      {/* 2. Patient Demographics & Identification */}
      {isIncluded('patient_identity') && (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-lg p-4 space-y-2 break-inside-avoid">
          <div className="flex items-center gap-2 pb-2 border-b border-[#EAE4DB]">
            <User className="w-3.5 h-3.5 text-[#1B3B2B]" />
            <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
              Patient Identification
            </h2>
            {header.deIdentified && (
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                De-Identified Record
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[#6A726C] block font-medium">Patient Name</span>
              <p className="font-semibold text-[#18201C]">{patientInfo.displayName}</p>
            </div>
            <div>
              <span className="text-[#6A726C] block font-medium">Patient Identifier</span>
              <p className="font-mono text-[#18201C]">{patientInfo.patientNumber || 'None'}</p>
            </div>
            <div>
              <span className="text-[#6A726C] block font-medium">Date of Birth / Age</span>
              <p className="text-[#18201C]">
                {patientInfo.dateOfBirth ? formatClinicalDate(patientInfo.dateOfBirth) : 'Masked'}{' '}
                {patientInfo.age !== undefined && `(${patientInfo.age} yrs)`}
              </p>
            </div>
            <div>
              <span className="text-[#6A726C] block font-medium">Clinical Sex</span>
              <p className="text-[#18201C]">{patientInfo.sex || 'Unspecified'}</p>
            </div>
          </div>

          {!header.deIdentified && (patientInfo.phone || patientInfo.email) && (
            <div className="pt-2 border-t border-[#EAE4DB] flex flex-wrap gap-4 text-xs text-[#525954]">
              {patientInfo.phone && <span>Tel: {patientInfo.phone}</span>}
              {patientInfo.email && <span>Email: {patientInfo.email}</span>}
            </div>
          )}
        </div>
      )}

      {/* Optional Custom Cover Remarks */}
      {config.customClinicalNotes && (
        <div className="bg-[#FFFFFF] border border-[#E3DDD2] rounded-lg p-4 space-y-1 break-inside-avoid">
          <span className="text-[11px] font-bold text-[#1B3B2B] uppercase tracking-wider">
            Clinical Cover Remarks
          </span>
          <p className="text-xs text-[#2A312C] leading-relaxed whitespace-pre-wrap">
            {config.customClinicalNotes}
          </p>
        </div>
      )}

      {/* 3. Documented Patient Safety Context */}
      {isIncluded('safety_context') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#8C3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Documented Patient Safety Context
              </h2>
            </div>
            {safety.verifiedCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                {safety.verifiedCount} verified item{safety.verifiedCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {safety.totalAlertCount > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Allergies */}
              <div className="bg-[#FAF8F5] border border-[#EAE4DB] rounded p-2.5 space-y-1">
                <span className="font-semibold text-[#8C3B2B] text-[11px] block">
                  Allergies ({safety.allergies.length})
                </span>
                {safety.allergies.length > 0 ? (
                  <ul className="space-y-1">
                    {safety.allergies.map((a) => (
                      <li key={a.id} className="text-[11px] text-[#18201C]">
                        &bull; <span className="font-medium">{a.allergen}</span>: {a.reaction} ({a.severity}) &bull;{' '}
                        <span className="text-[#636A64] capitalize">{a.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[#757C76] italic">No allergies recorded.</p>
                )}
              </div>

              {/* Persistent Precautions */}
              <div className="bg-[#FAF8F5] border border-[#EAE4DB] rounded p-2.5 space-y-1">
                <span className="font-semibold text-[#18201C] text-[11px] block">
                  Persistent Precautions ({safety.persistentPrecautions.length})
                </span>
                {safety.persistentPrecautions.length > 0 ? (
                  <ul className="space-y-1">
                    {safety.persistentPrecautions.map((p) => (
                      <li key={p.id} className="text-[11px] text-[#18201C]">
                        &bull; <span className="font-medium">{p.precaution}</span> ({p.category})
                        {p.details && ` - ${p.details}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[#757C76] italic">No persistent precautions recorded.</p>
                )}
              </div>

              {/* Surgical History */}
              <div className="bg-[#FAF8F5] border border-[#EAE4DB] rounded p-2.5 space-y-1">
                <span className="font-semibold text-[#18201C] text-[11px] block">
                  Surgical History ({safety.surgicalHistory.length})
                </span>
                {safety.surgicalHistory.length > 0 ? (
                  <ul className="space-y-1">
                    {safety.surgicalHistory.map((s) => (
                      <li key={s.id} className="text-[11px] text-[#18201C]">
                        &bull; <span className="font-medium">{s.procedure}</span> ({s.year}) - {s.region}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[#757C76] italic">No surgical history recorded.</p>
                )}
              </div>

              {/* Persistent Medical Conditions & Mobility */}
              <div className="bg-[#FAF8F5] border border-[#EAE4DB] rounded p-2.5 space-y-1">
                <span className="font-semibold text-[#18201C] text-[11px] block">
                  Medical Conditions & Mobility
                </span>
                {safety.persistentMedicalConditions.length > 0 ? (
                  <ul className="space-y-1 mb-1.5">
                    {safety.persistentMedicalConditions.map((c) => (
                      <li key={c.id} className="text-[11px] text-[#18201C]">
                        &bull; <span className="font-medium">{c.condition}</span> ({c.physioRelevance})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[#757C76] italic mb-1">No persistent medical conditions recorded.</p>
                )}
                {safety.mobilityContext?.baseline && (
                  <p className="text-[11px] text-[#343B36] pt-1 border-t border-[#EAE4DB]">
                    <span className="font-medium">Baseline Mobility:</span> {safety.mobilityContext.baseline}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No persistent safety information recorded.
            </div>
          )}
        </div>
      )}

      {/* 4. Episodes of Care Directory */}
      {isIncluded('episodes_history') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Episodes of Care Directory ({episodes.length})
              </h2>
            </div>
          </div>

          {episodes.length > 0 ? (
            <div className="space-y-3">
              {episodes.map((ep) => (
                <div
                  key={ep.caseId}
                  className="bg-[#FAF8F5] border border-[#EAE4DB] rounded-lg p-3.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#EAE5DC] text-[#343B36] border border-[#DDD6CB]">
                        {ep.displayId}
                      </span>
                      <h3 className="text-xs font-bold text-[#18201C]">{ep.caseName}</h3>
                    </div>
                    <div>
                      {ep.isActiveEpisode ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF2EE] text-[#1B3B2B] border border-[#D5E2DA]">
                          [ACTIVE EPISODE: {ep.status}]
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4EFE8] text-[#555C57] border border-[#E5DFD4]">
                          [DISCHARGED]
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#525954] pt-1">
                    <div>
                      <span className="text-[#757C76] block">Start Date:</span>
                      <p className="font-medium text-[#18201C]">{formatClinicalDate(ep.startDate)}</p>
                    </div>
                    <div>
                      <span className="text-[#757C76] block">Discharge Date:</span>
                      <p className="font-medium text-[#18201C]">
                        {ep.dischargeDate ? formatClinicalDate(ep.dischargeDate) : 'In progress'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#757C76] block">Sessions Recorded:</span>
                      <p className="font-medium text-[#18201C]">{ep.totalSessions} encounter{ep.totalSessions === 1 ? '' : 's'}</p>
                    </div>
                    <div>
                      <span className="text-[#757C76] block">Problems / Goals:</span>
                      <p className="font-medium text-[#18201C]">
                        {ep.problemCounts.total} prob &bull; {ep.goalCounts.total} goal
                      </p>
                    </div>
                  </div>

                  {ep.dischargeReason && (
                    <div className="text-[11px] pt-1 border-t border-[#EAE4DB]">
                      <span className="text-[#757C76] font-medium">Discharge Reason: </span>
                      <span className="font-medium text-[#18201C] capitalize">
                        {ep.dischargeReason.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {ep.episodeSummary && (
                    <div className="text-[11px] pt-1 bg-[#FFFFFF]/70 p-2 rounded border border-[#EDE7DE] text-[#2D3530]">
                      <span className="font-semibold block text-[#1B3B2B] text-[10px] uppercase">
                        Course of Care Summary:
                      </span>
                      <p className="italic leading-relaxed">{ep.episodeSummary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No prior episodes documented.
            </div>
          )}
        </div>
      )}

      {/* 5. Cumulative Problem History */}
      {isIncluded('cumulative_problems') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Cumulative Problem History ({cumulativeProblems.length})
              </h2>
            </div>
          </div>

          {cumulativeProblems.length > 0 ? (
            <div className="divide-y divide-[#EAE4DB] border border-[#EAE4DB] rounded-lg overflow-hidden">
              {cumulativeProblems.map((prob) => (
                <div key={prob.id} className="p-3 bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#18201C]">{prob.problemStatement}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${
                        prob.sourceStatus === 'active'
                          ? 'bg-[#EBF2EE] text-[#1B3B2B] border-[#D5E2DA]'
                          : 'bg-[#F4EFE8] text-[#555C57] border-[#E5DFD4]'
                      }`}>
                        {prob.sourceStatus.toUpperCase()}
                      </span>
                    </div>
                    {prob.therapistNotes && (
                      <p className="text-[11px] text-[#525954] italic">{prob.therapistNotes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-[#757C76] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#343B36]">
                      {prob.originatingCaseDisplayId || prob.originatingCaseName}
                    </span>
                    <span>{formatClinicalDate(prob.formulatedDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No clinical problems documented.
            </div>
          )}
        </div>
      )}

      {/* 6. Cross-Episode Outcomes & Trajectories */}
      {isIncluded('cross_episode_outcomes') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Cross-Episode Outcome Trajectories ({outcomeSeries.length})
              </h2>
            </div>
          </div>

          {outcomeSeries.length > 0 ? (
            <div className="space-y-3">
              {outcomeSeries.map((series) => (
                <div key={series.seriesKey} className="border border-[#EAE4DB] rounded-lg overflow-hidden">
                  <div className="bg-[#F4EFE8] px-3 py-1.5 border-b border-[#EAE4DB] flex items-center justify-between">
                    <span className="font-bold text-[#18201C] text-xs">
                      {series.measureName} {series.unit && `(${series.unit})`}
                    </span>
                    <span className="text-[10px] text-[#636A64] uppercase font-semibold">
                      {series.category}
                    </span>
                  </div>

                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#FAF8F5] text-[#6A726C] border-b border-[#EAE4DB]">
                      <tr>
                        <th className="p-2 font-semibold">Episode</th>
                        <th className="p-2 font-semibold">Baseline Date & Score</th>
                        <th className="p-2 font-semibold">Latest Date & Score</th>
                        <th className="p-2 font-semibold text-right">Net Raw Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4DB] bg-white text-[#18201C]">
                      {series.episodes.map((ep) => (
                        <tr key={ep.caseId}>
                          <td className="p-2 font-mono">
                            {ep.caseDisplayId}{' '}
                            {ep.isClosed ? (
                              <span className="text-[10px] text-[#757C76]">[Closed]</span>
                            ) : (
                              <span className="text-[10px] text-[#1B3B2B] font-semibold">[Active]</span>
                            )}
                          </td>
                          <td className="p-2">
                            {ep.baselineValue !== undefined ? (
                              <span>
                                {ep.baselineValue} {series.unit}{' '}
                                {ep.baselineDate && (
                                  <span className="text-[10px] text-[#757C76]">
                                    ({formatClinicalDate(ep.baselineDate)})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[#757C76]">—</span>
                            )}
                          </td>
                          <td className="p-2">
                            {ep.latestValue !== undefined ? (
                              <span>
                                {ep.latestValue} {series.unit}{' '}
                                {ep.latestDate && (
                                  <span className="text-[10px] text-[#757C76]">
                                    ({formatClinicalDate(ep.latestDate)})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[#757C76]">—</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-medium">
                            {ep.rawDelta !== undefined ? (
                              <span>
                                {ep.rawDelta > 0 ? `+${ep.rawDelta}` : `${ep.rawDelta}`}{' '}
                                {series.unit}
                              </span>
                            ) : (
                              <span className="text-[#757C76]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No outcome measurements documented across episodes.
            </div>
          )}
        </div>
      )}

      {/* 7. Historical Treatment Context */}
      {isIncluded('historical_treatments') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Historical Treatment Context ({historicalTreatments.length})
              </h2>
            </div>
          </div>

          {historicalTreatments.length > 0 ? (
            <div className="border border-[#EAE4DB] rounded-lg divide-y divide-[#EAE4DB] overflow-hidden text-xs">
              {historicalTreatments.map((tx) => (
                <div key={tx.id} className="p-2.5 bg-[#FAF8F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#18201C]">{tx.treatmentName}</span>
                    <div className="text-[11px] text-[#525954] mt-0.5 space-x-2">
                      <span>Enc: Session #{tx.sessionNumber}</span>
                      {tx.dosageParameters && <span>&bull; {tx.dosageParameters}</span>}
                      {tx.tolerance && (
                        <span>&bull; Tolerance: <span className="capitalize">{tx.tolerance.replace(/_/g, ' ')}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-[11px] font-mono text-[#757C76]">
                    <span className="px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#343B36] mr-2">
                      {tx.originatingCaseDisplayId || tx.originatingCaseName}
                    </span>
                    <span>{formatClinicalDate(tx.sessionDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No historical treatment deliveries recorded.
            </div>
          )}
        </div>
      )}

      {/* 8. Longitudinal Clinical Timeline */}
      {isIncluded('clinical_timeline') && (
        <div className="space-y-2.5 break-inside-avoid">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1B3B2B]" />
              <h2 className="text-xs font-bold text-[#18201C] uppercase tracking-wider">
                Longitudinal Clinical Timeline ({timelineEvents.length})
              </h2>
            </div>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-2">
              {timelineEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#18201C]">{evt.title}</span>
                      {evt.caseName && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#EAE5DC] text-[#343B36]">
                          {evt.caseName}
                        </span>
                      )}
                    </div>
                    <p className="text-[#525954] leading-relaxed">{evt.summary}</p>
                  </div>
                  <span className="font-mono text-[#757C76] shrink-0">
                    {formatClinicalDate(evt.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded bg-[#FAF8F5] border border-[#EAE4DB] text-xs text-[#757C76] italic">
              No timeline events available.
            </div>
          )}
        </div>
      )}

      {/* 9. Clinician Declaration & Signature Block */}
      {isIncluded('therapist_declaration') && (
        <div className="pt-6 border-t-2 border-[#1B3B2B] space-y-4 break-inside-avoid">
          <div className="flex items-start gap-2 text-xs text-[#343B36]">
            <FileCheck2 className="w-4 h-4 text-[#1B3B2B] shrink-0 mt-0.5" />
            <p className="italic leading-relaxed">
              I confirm that this Longitudinal Patient Summary is a true and factual compilation of the clinical records, objective measurements, and delivered interventions documented for this patient.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
            <div className="border-t border-[#18201C] pt-1">
              <p className="font-bold text-[#18201C]">{therapistDeclaration.practitionerName}</p>
              <p className="text-[#525954]">{therapistDeclaration.credentials}</p>
              {therapistDeclaration.licenseNumber && (
                <p className="text-[#525954] font-mono">Registration: {therapistDeclaration.licenseNumber}</p>
              )}
            </div>
            <div className="border-t border-[#18201C] pt-1 sm:text-right">
              <p className="font-medium text-[#18201C]">{therapistDeclaration.clinicName}</p>
              <p className="text-[#525954]">Authenticated: {therapistDeclaration.declarationDate}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
